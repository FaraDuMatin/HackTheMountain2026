import * as THREE from 'three'
import type { AudioFeatures } from './audio-features'

export type SpatialMapper = (features: AudioFeatures, elapsedSec: number) => THREE.Vector3

// Direct mapping: each frequency band drives one axis, centered at origin.
// Values are (band - 0.5) * SCALE, so the spawn region is [-SCALE/2, SCALE/2]^3.
//
// >>> TUNING KNOBS <<<
//   SCALE  — how far points spread based on audio. Larger = bigger cube.
//   JITTER — random noise added per emission. Larger = more visual spread
//            around the cluster center (matters most because real music's
//            bass/mid/high are highly correlated — they don't vary enough
//            on their own to fill the cube).
const SCALE = 80
const JITTER = 15

export const directMapper: SpatialMapper = (f) => {
  const j = () => (Math.random() - 0.5) * JITTER
  return new THREE.Vector3(
    (f.bass - 0.5) * SCALE + j(),
    (f.mid - 0.5) * SCALE + j(),
    (f.high - 0.5) * SCALE + j(),
  )
}

// Time-as-axis mapping (kept as fallback option): X grows with elapsed time,
// Y/Z driven by mid/high. Creates a "tape" through space — but extends in
// one direction off-screen with no bound.
//
// >>> TUNING KNOBS <<<
//   TIME_SPEED  — how fast the tape extends along X (units / sec)
//   TIME_START  — X position where the first point appears
//   YZ_SCALE    — how far points spread along Y/Z based on mid/high
//   TIME_JITTER — small noise per emission, prevents perfect alignment
const TIME_SPEED = 6
const TIME_START = -60
const YZ_SCALE = 80
const TIME_JITTER = 4

export const timeMapper: SpatialMapper = (f, elapsedSec) => {
  const j = () => (Math.random() - 0.5) * TIME_JITTER
  return new THREE.Vector3(
    elapsedSec * TIME_SPEED + TIME_START + j(),
    (f.mid - 0.5) * YZ_SCALE + j(),
    (f.high - 0.5) * YZ_SCALE + j(),
  )
}
