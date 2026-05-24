export type AudioFeatures = {
  bass: number  // 0–1
  mid: number   // 0–1
  high: number  // 0–1
}

// ─── Preset normalization — music ────────────────────────────────────────────
// Set USE_PRESET_NORM = true to lock the music normalizer to the ranges below.
// Tweak PRESET_NORM values here whenever you find a range that looks great.
const USE_PRESET_NORM = true

const PRESET_NORM = {
  bass: { min: 0.9464052319526672, max: 1 },
  mid:  { min: 0.8199346661567688, max: 0.9245098233222961 },
  high: { min: 0.32000693678855896, max: 0.4355717599391937 },
}
// ────────────────────────────────────────────────────────────────────────────

// ─── Preset normalization — microphone ───────────────────────────────────────
// Set USE_PRESET_NORM_MIC = true to lock the mic normalizer to the ranges below.
// Tweak PRESET_NORM_MIC values here whenever you find a range that looks great.
const USE_PRESET_NORM_MIC = true

const PRESET_NORM_MIC = {
  bass: { min: 0.54248366951942444, max: 1 },
  mid:  { min: 0.2,  max: 0.52679738998413086 },
  high: { min: 0.04,                max: 0.1492104709148407 },
}
// ────────────────────────────────────────────────────────────────────────────

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

// Rolling-window normalizer: remaps each band so the observed range over the
// last NORM_WINDOW calls becomes [0, 1]. If the range is tiny (< 0.01), returns
// 0.5 to avoid dividing by near-zero during silent sections.
//
// Persists calibrated min/max to localStorage so the normalizer starts warm on
// subsequent sessions instead of needing ~10 sec to stabilize.
const NORM_WINDOW = 150  // ~10 sec at 15 Hz emission rate
const LS_KEY = 'audio-norm-v1'
const LS_TTL_MS = 7 * 24 * 60 * 60 * 1000  // expire saved values after 7 days

interface PersistedNorm {
  bass: { min: number; max: number }
  mid:  { min: number; max: number }
  high: { min: number; max: number }
  savedAt: number
}

function loadPersistedNorm(): PersistedNorm | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as PersistedNorm
    if (Date.now() - p.savedAt > LS_TTL_MS) {
      localStorage.removeItem(LS_KEY)
      return null
    }
    return p
  } catch {
    return null
  }
}

function savePersistedNorm(bass: Float32Array, mid: Float32Array, high: Float32Array) {
  const extremes = (buf: Float32Array) => {
    let min = buf[0], max = buf[0]
    for (let i = 1; i < buf.length; i++) {
      if (buf[i] < min) min = buf[i]
      if (buf[i] > max) max = buf[i]
    }
    return { min, max }
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      bass: extremes(bass), mid: extremes(mid), high: extremes(high),
      savedAt: Date.now(),
    } satisfies PersistedNorm))
  } catch { /* storage full or unavailable */ }
}

function remapFixed(value: number, min: number, max: number): number {
  const range = max - min
  if (range < 0.01) return 0.5
  return Math.max(0, Math.min(1, (value - min) / range))
}

export function createNormalizedExtractor(usePreset = USE_PRESET_NORM) {
  if (usePreset) {
    return (fft: Uint8Array): AudioFeatures => {
      const raw = extractFeatures(fft)
      return {
        bass: remapFixed(raw.bass, PRESET_NORM.bass.min, PRESET_NORM.bass.max),
        mid:  remapFixed(raw.mid,  PRESET_NORM.mid.min,  PRESET_NORM.mid.max),
        high: remapFixed(raw.high, PRESET_NORM.high.min, PRESET_NORM.high.max),
      }
    }
  }

  if (USE_PRESET_NORM_MIC) {
    return (fft: Uint8Array): AudioFeatures => {
      const raw = extractFeatures(fft)
      return {
        bass: remapFixed(raw.bass, PRESET_NORM_MIC.bass.min, PRESET_NORM_MIC.bass.max),
        mid:  remapFixed(raw.mid,  PRESET_NORM_MIC.mid.min,  PRESET_NORM_MIC.mid.max),
        high: remapFixed(raw.high, PRESET_NORM_MIC.high.min, PRESET_NORM_MIC.high.max),
      }
    }
  }

  const bass = new Float32Array(NORM_WINDOW)
  const mid  = new Float32Array(NORM_WINDOW)
  const high = new Float32Array(NORM_WINDOW)
  let head = 0
  let count = 0

  const saved = loadPersistedNorm()
  if (saved) {
    for (let i = 0; i < NORM_WINDOW; i++) {
      bass[i] = i % 2 === 0 ? saved.bass.min : saved.bass.max
      mid[i]  = i % 2 === 0 ? saved.mid.min  : saved.mid.max
      high[i] = i % 2 === 0 ? saved.high.min : saved.high.max
    }
    count = NORM_WINDOW
  }

  function remap(buf: Float32Array, value: number): number {
    const n = Math.min(count, NORM_WINDOW)
    let min = buf[0], max = buf[0]
    for (let i = 1; i < n; i++) {
      if (buf[i] < min) min = buf[i]
      if (buf[i] > max) max = buf[i]
    }
    const range = max - min
    if (range < 0.01) return 0.5
    return Math.max(0, Math.min(1, (value - min) / range))
  }

  return (fft: Uint8Array): AudioFeatures => {
    const raw = extractFeatures(fft)
    bass[head] = raw.bass
    mid[head]  = raw.mid
    high[head] = raw.high
    head = (head + 1) % NORM_WINDOW
    count++

    if (count >= NORM_WINDOW && count % 50 === 0) {
      savePersistedNorm(bass, mid, high)
    }

    return {
      bass: remap(bass, raw.bass),
      mid:  remap(mid,  raw.mid),
      high: remap(high, raw.high),
    }
  }
}
