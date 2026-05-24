import * as THREE from 'three'
import { NUM_FFT_POINTS } from './util'
import { createNormalizedExtractor } from './audio-features'
import { directMapper } from './spatial-mapping'
import { bassHueMapper } from './color-mapping'
import { createPointCloud } from './point-cloud'
import { createTrail } from './trail'
import { createScene } from './3d-scene'
import type { ArtworkData } from './artwork-data'

// Sliding window size: trail keeps at most this many most-recent vertices.
// Lower = shorter visible history (less clutter), higher = more accumulated drawing.
// Try 500–1000 for a snappy comet-tail look, 5000+ for a long persistent path.
const MAX_TRAIL_POINTS = 50

export type VisualizerHandle = {
  stop(): void
  snapshot(): ArtworkData
}

export function startFFT3DVisualizer(
  analyser: AnalyserNode,
  mount: HTMLDivElement,
  audio: HTMLAudioElement | null,
  liveInputRef?: { current: boolean },       // true while mic is active — keeps main FFT sampling when audio is paused
  micAnalyserRef?: { current: AnalyserNode | null },  // mic-only FFT tap → glow cloud
): VisualizerHandle {
  const { scene, camera, renderer, cameraController, dispose: disposeScene } = createScene(mount)

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
  }
}
