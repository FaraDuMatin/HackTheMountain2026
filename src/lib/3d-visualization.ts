import * as THREE from 'three'
import { NUM_FFT_POINTS } from './util'
import { createNormalizedExtractor } from './audio-features'
import { directMapper } from './spatial-mapping'
import { bassHueMapper } from './color-mapping'
import { createPointCloud } from './point-cloud'
import { createTrail } from './trail'

// Sliding window size: trail keeps at most this many most-recent vertices.
// Lower = shorter visible history (less clutter), higher = more accumulated drawing.
// Try 500–1000 for a snappy comet-tail look, 5000+ for a long persistent path.
const MAX_TRAIL_POINTS = 20

function createCameraController(
  camera: THREE.PerspectiveCamera,
  mount: HTMLDivElement,
  initialYaw = 0,
  initialPitch = 0,
) {
  const keys: Record<string, boolean> = {}
  let yaw = initialYaw
  let pitch = initialPitch
  const speed = 0.9
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
  audio: HTMLAudioElement | null,
  liveInputRef?: { current: boolean },       // true while mic is active — keeps main FFT sampling when audio is paused
  micAnalyserRef?: { current: AnalyserNode | null },  // mic-only FFT tap → glow cloud
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
  // Mic-only extractor: always dynamic (ignores PRESET_NORM) so it self-calibrates
  // to the mic's actual signal range rather than the music-tuned preset values.
  const extractMicFeatures = createNormalizedExtractor(false)

  // --- Point cloud system ---
  const pointCloud = createPointCloud(scene, {
    maxPoints: 200,
    lifetimeSec: 5,
    pointSize: 0.4,
  })

  // Glow layer: large additive-blended spheres emitted only during mic input.
  // Additive blending on the dark background makes overlapping spheres bloom.
  const glowCloud = createPointCloud(scene, {
    maxPoints: 100,
    lifetimeSec: 2,
    pointSize: 3.0,
    blending: THREE.AdditiveBlending,
  })

  // Persistent trails — never fade, capped at MAX_TRAIL_POINTS, gradient between
  // consecutive vertex colors via vertexColors interpolation.
  const mainTrail = createTrail(scene, { maxPoints: MAX_TRAIL_POINTS })
  const glowTrail = createTrail(scene, {
    maxPoints: MAX_TRAIL_POINTS,
    blending: THREE.AdditiveBlending,
  })

  const dataArray = new Uint8Array(NUM_FFT_POINTS)
  const micDataArray = new Uint8Array(NUM_FFT_POINTS)
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

    // Only sample FFT + emit when there's audio to read.
    // When the audio element is paused, getByteFrequencyData returns the last
    // captured buffer indefinitely, which would keep emitting stale points.
    // In instrument-only mode (audio === null), always sample — the noise-floor
    // gate below skips emission during silence.
    const isPlaying = (audio ? !audio.paused : true) || (liveInputRef?.current ?? false)

    if (isPlaying) {
      analyser.getByteFrequencyData(dataArray)

      // Noise-floor gate: sum all bins; skip emit when essentially silent.
      // Strict 0 would miss real silence due to analyser noise floor.
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]

      // Emit a new point every 4 frames (~15/sec at 60fps)
      if (sum > 200 && frameCounter % 4 === 0) {
        const isMicOnly = (liveInputRef?.current ?? false) && (audio === null || audio.paused)
        const features = isMicOnly ? extractMicFeatures(dataArray) : extractFeatures(dataArray)
        const position = directMapper(features, elapsed)
        const color = bassHueMapper(features)
        pointCloud.emit(position, color)
        mainTrail.extend(position, color)
      }
    }

    // Glow cloud: driven exclusively by the mic-only analyser.
    // Only emits when actual mic sound exceeds the noise floor.
    const micAnalyser = micAnalyserRef?.current
    if (micAnalyser && frameCounter % 4 === 0) {
      micAnalyser.getByteFrequencyData(micDataArray)
      let micSum = 0
      for (let i = 0; i < micDataArray.length; i++) micSum += micDataArray[i]
      if (micSum > 400) {
        const micFeatures = extractMicFeatures(micDataArray)
        const micPosition = directMapper(micFeatures, elapsed)
        const micColor = bassHueMapper(micFeatures)
        glowCloud.emit(micPosition, micColor)
        glowTrail.extend(micPosition, micColor)
      }
    }

    pointCloud.update(dt)
    glowCloud.update(dt)
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
    glowCloud.dispose()
    mainTrail.dispose()
    glowTrail.dispose()
    renderer.dispose()
    mount.removeChild(renderer.domElement)
  }
}
