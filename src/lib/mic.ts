export interface MicSetup {
  gainNode: GainNode
  micAnalyser: AnalyserNode
  stop: () => void
}

export async function setupMic(
  context: AudioContext,
  analyser: AnalyserNode,
  initialGain = 2.0,
): Promise<MicSetup> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  // The permission dialog suspends the AudioContext on some browsers. Resume
  // after the stream is granted so audio graph processing starts immediately.
  await context.resume()
  const source = context.createMediaStreamSource(stream)
  const gainNode = context.createGain()
  gainNode.gain.value = initialGain

  // Mic-only analyser: separate tap used exclusively for the glow point cloud.
  // The main analyser receives the mic mix alongside music for the regular cloud.
  const micAnalyser = context.createAnalyser()
  micAnalyser.fftSize = analyser.fftSize
  // Lower smoothing so the FFT decays quickly after sound stops (default 0.8 causes
  // several seconds of lingering signal above the noise gate).
  micAnalyser.smoothingTimeConstant = 0.01

  source.connect(gainNode)
  gainNode.connect(analyser)     // mixes with music → main point cloud
  gainNode.connect(micAnalyser)  // mic-only FFT tap → glow point cloud

  return {
    gainNode,
    micAnalyser,
    stop() {
      source.disconnect()
      gainNode.disconnect()
      stream.getTracks().forEach(t => t.stop())
    },
  }
}
