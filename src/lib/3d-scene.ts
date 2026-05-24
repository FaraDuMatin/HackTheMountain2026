import * as THREE from 'three'

// Shared scene factory used by both the live FFT visualizer and the static
// /art/[id] viewer. Owns the scene background, camera, renderer, lighting,
// orientation helpers (box/grid/axes), resize handling, and the WASD/mouse
// camera controller. Callers append their own meshes (point clouds, lines)
// and drive their own render loops.

export type CameraController = {
  update(): void
  cleanup(): void
  setSpeed(n: number): void
  setSensitivity(n: number): void
}

export const DEFAULT_CAMERA_SPEED = 0.9
export const DEFAULT_CAMERA_SENSITIVITY = 0.003

export type SceneSetup = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  cameraController: CameraController
  setWireframe(v: boolean): void
  dispose(): void
}

export type CameraInit = {
  position?: THREE.Vector3
  yaw?: number
  pitch?: number
}

// Default camera placement: in front of the spawn region [-40,40]^3, slightly
// above, tilted down toward the origin.
const DEFAULT_CAM_POS = new THREE.Vector3(0, 50, 130)
const DEFAULT_YAW = 0
const DEFAULT_PITCH = -Math.atan(DEFAULT_CAM_POS.y / DEFAULT_CAM_POS.z)

function createCameraController(
  camera: THREE.PerspectiveCamera,
  mount: HTMLDivElement,
  initialYaw: number,
  initialPitch: number,
): CameraController {
  const keys: Record<string, boolean> = {}
  let yaw = initialYaw
  let pitch = initialPitch
  let speed = DEFAULT_CAMERA_SPEED
  let sensitivity = DEFAULT_CAMERA_SENSITIVITY

  const onKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true }
  const onKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false }

  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== mount) return
    yaw -= e.movementX * sensitivity
    pitch -= e.movementY * sensitivity
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch))
  }

  const onMouseDown = () => { mount.requestPointerLock?.() }

  const onPointerlockChange = () => {
    if (document.pointerLockElement === mount) mount.style.cursor = 'none'
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  mount.addEventListener('mousemove', onMouseMove)
  mount.addEventListener('mousedown', onMouseDown)
  document.addEventListener('pointerlockchange', onPointerlockChange)

  const update = () => {
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw
    camera.rotation.x = pitch

    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3()
    right.crossVectors(forward, camera.up).normalize()

    if (keys['w']) camera.position.addScaledVector(forward, speed)
    if (keys['s']) camera.position.addScaledVector(forward, -speed)
    if (keys['d']) camera.position.addScaledVector(right, speed)
    if (keys['a']) camera.position.addScaledVector(right, -speed)
    if (keys[' ']) camera.position.y += speed
    if (keys['shift']) camera.position.y -= speed
  }

  const cleanup = () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    mount.removeEventListener('mousemove', onMouseMove)
    mount.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('pointerlockchange', onPointerlockChange)
    document.exitPointerLock?.()
  }

  const setSpeed = (n: number) => { speed = n }
  const setSensitivity = (n: number) => { sensitivity = n }

  return { update, cleanup, setSpeed, setSensitivity }
}

export function createScene(mount: HTMLDivElement, init: CameraInit = {}): SceneSetup {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#09090b')

  const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000)
  camera.position.copy(init.position ?? DEFAULT_CAM_POS)
  const cameraController = createCameraController(
    camera,
    mount,
    init.yaw ?? DEFAULT_YAW,
    init.pitch ?? DEFAULT_PITCH,
  )

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(mount.clientWidth, mount.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  mount.appendChild(renderer.domElement)

  // Lighting (kept for any future Standard materials; basic mesh ignores it)
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(10, 20, 10)
  scene.add(dirLight)

  // Wireframe helpers — always created so they can be toggled at runtime.
  const boxGeometry = new THREE.BoxGeometry(80, 80, 80)
  const boxEdges = new THREE.EdgesGeometry(boxGeometry)
  const boxLines = new THREE.LineSegments(
    boxEdges,
    new THREE.LineBasicMaterial({ color: 0x444466 }),
  )
  boxLines.visible = false
  scene.add(boxLines)
  boxGeometry.dispose()

  const grid = new THREE.GridHelper(80, 16, 0x333344, 0x222233)
  grid.position.set(0, -40, 0)
  grid.visible = false
  scene.add(grid)

  const axes = new THREE.AxesHelper(15)
  axes.position.set(-40, -40, -40)
  axes.visible = false
  scene.add(axes)

  const setWireframe = (v: boolean) => {
    boxLines.visible = v
    grid.visible = v
    axes.visible = v
  }

  const handleResize = () => {
    camera.aspect = mount.clientWidth / mount.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(mount.clientWidth, mount.clientHeight)
  }
  window.addEventListener('resize', handleResize)

  const dispose = () => {
    window.removeEventListener('resize', handleResize)
    cameraController.cleanup()
    renderer.dispose()
    if (renderer.domElement.parentNode === mount) {
      mount.removeChild(renderer.domElement)
    }
  }

  return { scene, camera, renderer, cameraController, setWireframe, dispose }
}
