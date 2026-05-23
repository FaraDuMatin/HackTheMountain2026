import * as THREE from 'three'
import { NUM_FFT_POINTS } from './util'
import { createNormalizedExtractor } from './audio-features'
import { directMapper } from './spatial-mapping'
import { bassHueMapper } from './color-mapping'
import { createPointCloud } from './point-cloud'

function createCameraController(
  camera: THREE.PerspectiveCamera,
  mount: HTMLDivElement,
  initialYaw = 0,
  initialPitch = 0,
) {
  const keys: Record<string, boolean> = {}
  let yaw = initialYaw
  let pitch = initialPitch
  const speed = 0.2
  const sensitivity = 0.003

  const onKeyDown = (e: KeyboardEvent) => {
    keys[e.key.toLowerCase()] = true
  }
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.key.toLowerCase()] = false
  }

  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== mount) return
    yaw -= e.movementX * sensitivity
    pitch -= e.movementY * sensitivity
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch))
  }

  const onMouseDown = () => {
    mount.requestPointerLock?.()
  }

  const onPointerlockChange = () => {
    const isLocked = document.pointerLockElement === mount
    if (isLocked) {
      mount.style.cursor = 'none'
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  mount.addEventListener('mousemove', onMouseMove)
  mount.addEventListener('mousedown', onMouseDown)
  document.addEventListener('pointerlockchange', onPointerlockChange)

  const update = () => {
    // Apply rotation first so getWorldDirection is accurate
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

  return { update, cleanup }
}

export function startFFT3DVisualizer(
  analyser: AnalyserNode,
  mount: HTMLDivElement,
  audio: HTMLAudioElement,
): () => void {
  // --- Scene setup ---
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#09090b')

  const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000)
  // Position camera in front of the spawn region, slightly above, looking at origin.
  // Spawn region is [-40, 40]^3 centered at (0, 0, 0).
  const camPos = new THREE.Vector3(0, 50, 130)
  camera.position.copy(camPos)
  // Initial yaw=0 (looking straight along -Z), pitch tilts down to face origin.
  const initialPitch = -Math.atan(camPos.y / camPos.z)
  const cameraController = createCameraController(camera, mount, 0, initialPitch)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(mount.clientWidth, mount.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  mount.appendChild(renderer.domElement)

  // --- Lighting (kept for any future Standard materials; basic mesh ignores it) ---
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(10, 20, 10)
  scene.add(dirLight)

  // --- Orientation helpers: wireframe box around spawn region + grid floor + axes ---
  // Points spawn in [-40, 40]^3 centered at origin
  const boxGeometry = new THREE.BoxGeometry(80, 80, 80)
  const boxEdges = new THREE.EdgesGeometry(boxGeometry)
  const boxLines = new THREE.LineSegments(
    boxEdges,
    new THREE.LineBasicMaterial({ color: 0x444466 }),
  )
  scene.add(boxLines)
  boxGeometry.dispose() // EdgesGeometry copies what it needs

  // Grid floor at y = -40 (bottom face of the box)
  const grid = new THREE.GridHelper(80, 16, 0x333344, 0x222233)
  grid.position.set(0, -40, 0)
  scene.add(grid)

  // Axes at the bottom-back-left corner of the box: X red, Y green, Z blue
  const axes = new THREE.AxesHelper(15)
  axes.position.set(-40, -40, -40)
  scene.add(axes)

  // --- Audio feature extractor with rolling normalization ---
  const extractFeatures = createNormalizedExtractor()

  // --- Point cloud system ---
  const pointCloud = createPointCloud(scene, {
    maxPoints: 200,
    lifetimeSec: 5,
    pointSize: 0.4,
  })

  const dataArray = new Uint8Array(NUM_FFT_POINTS)
  const startTime = performance.now() / 1000
  let lastFrameTime = startTime
  let frameCounter = 0
  let animFrame: number

  const draw = () => {
    const now = performance.now() / 1000
    const dt = now - lastFrameTime
    lastFrameTime = now
    const elapsed = now - startTime

    cameraController.update()

    // Only sample FFT + emit when audio is actually playing.
    // When the audio element is paused, getByteFrequencyData returns the last
    // captured buffer indefinitely, which would keep emitting stale points.
    const isPlaying = !audio.paused

    if (isPlaying) {
      analyser.getByteFrequencyData(dataArray)

      // Emit a new point every 4 frames (~15/sec at 60fps)
      if (frameCounter % 4 === 0) {
        const features = extractFeatures(dataArray)
        const position = directMapper(features, elapsed)
        const color = bassHueMapper(features)
        pointCloud.emit(position, color)
      }
    }

    pointCloud.update(dt)
    renderer.render(scene, camera)
    frameCounter++
    animFrame = requestAnimationFrame(draw)
  }

  draw()

  const handleResize = () => {
    camera.aspect = mount.clientWidth / mount.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(mount.clientWidth, mount.clientHeight)
  }
  window.addEventListener('resize', handleResize)

  return () => {
    cancelAnimationFrame(animFrame)
    window.removeEventListener('resize', handleResize)
    cameraController.cleanup()
    pointCloud.dispose()
    renderer.dispose()
    mount.removeChild(renderer.domElement)
  }
}
