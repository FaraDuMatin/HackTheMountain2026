export const NUM_FFT_POINTS = 128

export type AudioSetup = {
  context: AudioContext
  analyser: AnalyserNode
  audio: HTMLAudioElement
}

// Build an analyser around a real <audio> element. Using createMediaElementSource
// (instead of decodeAudioData + BufferSource) means Chrome treats this as a real
// media element — it shows in the tab's media controls and can be paused/scrubbed
// from the browser UI.
async function buildAnalyser(src: string): Promise<AudioSetup> {
  const audioContext = new AudioContext()
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = NUM_FFT_POINTS * 2

  const audio = new Audio()
  audio.loop = true
  audio.crossOrigin = 'anonymous'
  audio.src = src

  await new Promise<void>((resolve, reject) => {
    audio.addEventListener('canplay', () => resolve(), { once: true })
    audio.addEventListener('error', () => reject(new Error('Audio element error')), { once: true })
    audio.load()
  })

  const source = audioContext.createMediaElementSource(audio)
  source.connect(analyser)
  analyser.connect(audioContext.destination)
  await audio.play()

  return { context: audioContext, analyser, audio }
}

export async function setupAudioAnalyser(base64: string): Promise<AudioSetup> {
  // Base64 → Blob → object URL so the <audio> element can stream it like a normal file
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'audio/mpeg' })
  const url = URL.createObjectURL(blob)
  return buildAnalyser(url)
}

export async function setupAudioAnalyserFromUrl(url: string): Promise<AudioSetup> {
  return buildAnalyser(url)
}
