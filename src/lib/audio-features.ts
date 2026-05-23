export type AudioFeatures = {
  bass: number  // 0–1
  mid: number   // 0–1
  high: number  // 0–1
}

function averageBins(fft: Uint8Array, start: number, end: number): number {
  let sum = 0
  for (let i = start; i < end; i++) sum += fft[i]
  return sum / (end - start) / 255
}

export function extractFeatures(fft: Uint8Array): AudioFeatures {
  // 128 bins @ ~344 Hz/bin
  return {
    bass: averageBins(fft, 0, 3),    // ~0–1 kHz
    mid: averageBins(fft, 3, 15),    // ~1–5 kHz
    high: averageBins(fft, 15, 128), // ~5–22 kHz
  }
}
