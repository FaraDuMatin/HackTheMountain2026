import * as THREE from 'three'
import type { AudioFeatures } from './audio-features'

export type ColorMapper = (features: AudioFeatures) => THREE.Color

// RGB directly from the energy bands. Bass-heavy = red, mid = green, high = blue.
export const rgbFromFeaturesMapper: ColorMapper = (f) =>
  new THREE.Color(f.bass, f.mid, f.high)

// Bass-driven hue: low bass = cool blue, rising bass shifts to cyan → green → yellow → red.
// Saturation and lightness stay fixed so the color stays vivid.
export const bassHueMapper: ColorMapper = (f) => {
  const color = new THREE.Color()
  // hue 0.65 (blue) → 0.0 (red) as bass rises 0 → 1
  color.setHSL(0.65 - f.bass * 0.65, 0.9, 0.55)
  return color
}

// TODO: hueFromDominantBand — pick dominant band, map to a hue
