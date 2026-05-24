import * as THREE from 'three'
import { NUM_FFT_POINTS } from './util'
import { createNormalizedExtractor } from './audio-features'
import { directMapper } from './spatial-mapping'
import { bassHueMapper } from './color-mapping'
import { createPointCloud, type PointShape } from './point-cloud'
import {
  createTrail,
  type TrailStyle,
  type TrailCurve,
  RIBBON_LINEWIDTH_MAIN,
  RIBBON_LINEWIDTH_GLOW,
  PARTICLE_SIZE_MAIN,
  PARTICLE_SIZE_GLOW,
} from './trail'
import { createScene } from './3d-scene'
import type { ArtworkData } from './artwork-data'

// Removed: MAX_TRAIL_POINTS is now TRAIL_BUFFER_SIZE / DEFAULT_TRAIL_POINTS (exported above)

export type VisualizerHandle = {
  stop(): void
  snapshot(): ArtworkData
  setCameraSpeed(n: number): void
  setCameraSensitivity(n: number): void
  setTrailLength(n: number): void
  setPointShape(shape: PointShape): void
  setPointSize(n: number): void
  setTrailStyle(style: TrailStyle): void
  setTrailCurve(curve: TrailCurve): void
  setRibbonWidth(n: number): void
  setParticleSize(n: number): void
  setWireframe(v: boolean): void
}

export const TRAIL_BUFFER_SIZE = 1000   // pre-allocated max — never changes
export const DEFAULT_TRAIL_POINTS = 50  // starting visible cap
export const DEFAULT_POINT_SIZE = 3.0
const DEFAULT_GLOW_POINT_SIZE = 6.0
const GLOW_POINT_SIZE_RATIO = DEFAULT_GLOW_POINT_SIZE / DEFAULT_POINT_SIZE
const GLOW_RIBBON_WIDTH_RATIO = RIBBON_LINEWIDTH_GLOW / RIBBON_LINEWIDTH_MAIN
const GLOW_PARTICLE_SIZE_RATIO = PARTICLE_SIZE_GLOW / PARTICLE_SIZE_MAIN

export function startFFT3DVisualizer(
  analyser: AnalyserNode,
  mount: HTMLDivElement,
  audio: HTMLAudioElement | null,
  liveInputRef?: { current: boolean },       // true while mic is active — keeps main FFT sampling when audio is paused
  micAnalyserRef?: { current: AnalyserNode | null },  // mic-only FFT tap → glow cloud
): VisualizerHandle {
  const { scene, camera, renderer, cameraController, setWireframe, dispose: disposeScene } = createScene(mount)

  // --- Audio feature extractor with rolling normalization ---
  const extractFeatures = createNormalizedExtractor()
  // Mic-only extractor: always dynamic (ignores PRESET_NORM) so it self-calibrates
  // to the mic's actual signal range rather than the music-tuned preset values.
  const extractMicFeatures = createNormalizedExtractor(false)

  // --- Point cloud system ---
  const pointCloud = createPointCloud(scene, {
    maxPoints: 200,
    lifetimeSec: 5,
    pointSize: DEFAULT_POINT_SIZE,
  })

  // Glow layer: large additive-blended spheres emitted only during mic input.
  // Additive blending on the dark background makes overlapping spheres bloom.
  const glowCloud = createPointCloud(scene, {
    maxPoints: 100,
    lifetimeSec: 2,
    pointSize: DEFAULT_GLOW_POINT_SIZE,
    blending: THREE.AdditiveBlending,
  })

  const mainTrail = createTrail(scene, { maxPoints: TRAIL_BUFFER_SIZE, initialCap: DEFAULT_TRAIL_POINTS })
  const glowTrail = createTrail(scene, {
    maxPoints: TRAIL_BUFFER_SIZE,
    initialCap: DEFAULT_TRAIL_POINTS,
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

  return {
    stop() {
      cancelAnimationFrame(animFrame)
      pointCloud.dispose()
      glowCloud.dispose()
      mainTrail.dispose()
      glowTrail.dispose()
      disposeScene()
    },
    snapshot(): ArtworkData {
      return {
        version: 1,
        createdAt: new Date().toISOString(),
        mainTrail: mainTrail.snapshot(),
        glowTrail: glowTrail.snapshot(),
        camera: {
          position: [camera.position.x, camera.position.y, camera.position.z],
          yaw: camera.rotation.y,
          pitch: camera.rotation.x,
        },
      }
    },
    setCameraSpeed(n) { cameraController.setSpeed(n) },
    setCameraSensitivity(n) { cameraController.setSensitivity(n) },
    setTrailLength(n) { mainTrail.setMaxPoints(n); glowTrail.setMaxPoints(n) },
    setPointShape(shape) { pointCloud.setShape(shape); glowCloud.setShape(shape) },
    setPointSize(n) { pointCloud.setPointSize(n); glowCloud.setPointSize(n * GLOW_POINT_SIZE_RATIO) },
    setTrailStyle(style) { mainTrail.setStyle(style); glowTrail.setStyle(style) },
    setTrailCurve(curve) { mainTrail.setCurve(curve); glowTrail.setCurve(curve) },
    setRibbonWidth(n) { mainTrail.setRibbonWidth(n); glowTrail.setRibbonWidth(n * GLOW_RIBBON_WIDTH_RATIO) },
    setParticleSize(n) { mainTrail.setParticleSize(n); glowTrail.setParticleSize(n * GLOW_PARTICLE_SIZE_RATIO) },
    setWireframe(v) { setWireframe(v) },
  }
}
