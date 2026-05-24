'use client'

import { useRef, useEffect, useCallback, useState, useTransition } from 'react'
import { uploadAudio, downloadFromYoutube, saveArtworkAction } from './actions'
import { setupAudioAnalyser, setupAudioAnalyserFromUrl, createSilentAnalyser, type AudioSetup } from '@/lib/util'
import { setupMic, type MicSetup } from '@/lib/mic'
import { startFFT3DVisualizer, type VisualizerHandle } from '@/lib/3d-visualization'
import { UploadMp3Button } from '@/components/UploadMp3Button'
import { YoutubeImportButton } from '@/components/YoutubeImportButton'
import { MicButton } from '@/components/MicButton'
import { CaptureButton } from '@/components/CaptureButton'
import { CameraSettings } from '@/components/CameraSettings'


export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null)
  const captureButtonRef = useRef<HTMLButtonElement>(null)
  const visualizerRef = useRef<VisualizerHandle | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micRef = useRef<MicSetup | null>(null)
  const isMicActiveRef = useRef(false)
  const micAnalyserRef = useRef<AnalyserNode | null>(null)
  const [status, setStatus] = useState('Press 1–0 to pick a song, upload an MP3, or use your microphone')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isYtPending, setIsYtPending] = useState(false)
  const [isMicActive, setIsMicActive] = useState(false)
  const [isMicLoading, setIsMicLoading] = useState(false)
  const [micGain, setMicGain] = useState(2.0)

  const teardown = useCallback(() => {
    micRef.current?.stop()
    micRef.current = null
    isMicActiveRef.current = false
    micAnalyserRef.current = null
    setIsMicActive(false)
    visualizerRef.current?.stop()
    visualizerRef.current = null
    audioRef.current?.pause()
    contextRef.current?.close()
    analyserRef.current = null
    contextRef.current = null
    audioRef.current = null
  }, [])

  const startVisualizer = useCallback((setup: AudioSetup) => {
    contextRef.current = setup.context
    audioRef.current = setup.audio
    analyserRef.current = setup.analyser
    if (mountRef.current) {
      visualizerRef.current?.stop()
      visualizerRef.current = startFFT3DVisualizer(setup.analyser, mountRef.current, setup.audio, isMicActiveRef, micAnalyserRef)
    }
    setIsLoaded(true)
    setStatus(setup.audio
      ? 'Playing — P to pause | click scene to look around | WASD to move'
      : 'Mic active — make some noise! | click scene to look around | WASD to move')
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    teardown()
    setStatus('Uploading to server…')

    const formData = new FormData()
    formData.append('audio', file)

    startTransition(async () => {
      console.log(`[page] Sending to server: "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
      let base64: string
      try {
        base64 = await uploadAudio(formData)
        setStatus('Server processed. Starting playback…')
      } catch (err) {
        console.error('[page] Server action failed:', err)
        setStatus(`Server error: ${(err as Error).message}`)
        return
      }
      try {
        const setup = await setupAudioAnalyser(base64)
        startVisualizer(setup)
      } catch (err) {
        console.error('[page] Audio decode/playback failed:', err)
        setStatus(`Playback error: ${(err as Error).message}`)
      }
    })
  }, [teardown, startVisualizer])

  const handleYoutubeDownload = useCallback(async (url: string) => {
    teardown()
    setIsYtPending(true)
    setStatus('Contacting YouTube backend… (may take up to 30 s on first load)')

    let base64: string
    try {
      base64 = await downloadFromYoutube(url)
      setStatus('Downloaded. Starting playback…')
    } catch (err) {
      console.error('[page] YouTube download failed:', err)
      setStatus(`YouTube error: ${(err as Error).message}`)
      setIsYtPending(false)
      return
    }

    try {
      const setup = await setupAudioAnalyser(base64)
      startVisualizer(setup)
    } catch (err) {
      console.error('[page] Audio playback failed:', err)
      setStatus(`Playback error: ${(err as Error).message}`)
    }
    setIsYtPending(false)
  }, [teardown, startVisualizer])

  const handleMicToggle = useCallback(async () => {
    if (micRef.current) {
      micRef.current.stop()
      micRef.current = null
      isMicActiveRef.current = false
      micAnalyserRef.current = null
      setIsMicActive(false)
      const audio = audioRef.current
      setStatus(audio && !audio.paused
        ? 'Playing — P to pause | click scene to look around | WASD to move'
        : audio
          ? 'Paused — press P to resume'
          : 'Press 1–0 to pick a song, upload an MP3, or use your microphone')
      return
    }

    setIsMicLoading(true)
    try {
      // Bootstrap a silent AudioContext + visualizer if no song is loaded yet
      if (!contextRef.current || !analyserRef.current) {
        const setup = createSilentAnalyser()
        await setup.context.resume()
        startVisualizer(setup)
      }
      const mic = await setupMic(contextRef.current!, analyserRef.current!, micGain)
      micRef.current = mic
      isMicActiveRef.current = true
      micAnalyserRef.current = mic.micAnalyser
      setIsMicActive(true)
      setStatus('Mic active — make some noise! | click scene to look around | WASD to move')
    } catch (err) {
      console.error('[page] Mic setup failed:', err)
      setStatus(`Mic error: ${(err as Error).message}`)
    }
    setIsMicLoading(false)
  }, [startVisualizer, micGain])

  const handleMicGainChange = useCallback((gain: number) => {
    setMicGain(gain)
    if (micRef.current) {
      micRef.current.gainNode.gain.value = gain
    }
  }, [])

  const handleCapture = useCallback(async (): Promise<string> => {
    const handle = visualizerRef.current
    if (!handle) throw new Error('Nothing to capture yet — start audio or mic first')
    const data = handle.snapshot()
    const id = await saveArtworkAction(data)
    return `/art/${id}`
  }, [])

  useEffect(() => {
    const handleKey = async (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'm') {
        await handleMicToggle()
        return
      }
      if (key === 'c') {
        captureButtonRef.current?.click()
        return
      }
      // Number keys 1–0 load the matching default song
      if (/^[0-9]$/.test(e.key)) {
        setStatus(`Loading default${e.key}.mp3…`)
        try {
          teardown()
          const setup = await setupAudioAnalyserFromUrl(`/default${e.key}.mp3`)
          startVisualizer(setup)
        } catch (err) {
          console.error(`[page] Failed to load default${e.key}.mp3:`, err)
          setStatus(`Failed to load default${e.key}.mp3: ${(err as Error).message}`)
        }
        return
      }
      if (key !== 'p') return
      const audio = audioRef.current
      if (!audio) return
      if (audio.paused) {
        await audio.play()
        setStatus('Playing — P to pause | click scene to look around | WASD to move')
      } else {
        audio.pause()
        setStatus('Paused — press P to resume')
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      teardown()
    }
  }, [startVisualizer, teardown, handleMicToggle])

  const isBusy = isPending || isYtPending

  const buttons = (
    <>
      <UploadMp3Button disabled={isBusy} isPending={isPending} onFileChange={handleFileChange} />
      <YoutubeImportButton disabled={isBusy} isPending={isYtPending} onSubmit={handleYoutubeDownload} />
      <MicButton
        isActive={isMicActive}
        isLoading={isMicLoading}
        gain={micGain}
        onToggle={handleMicToggle}
        onGainChange={handleMicGainChange}
      />
      <CaptureButton ref={captureButtonRef} onCapture={handleCapture} disabled={!isLoaded} />
    </>
  )

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      <div ref={mountRef} className="absolute inset-0" />

      <CameraSettings
        onSpeedChange={(n) => visualizerRef.current?.setCameraSpeed(n)}
        onSensitivityChange={(n) => visualizerRef.current?.setCameraSensitivity(n)}
        onTrailLengthChange={(n) => visualizerRef.current?.setTrailLength(n)}
        onShapeChange={(s) => visualizerRef.current?.setPointShape(s)}
        onTrailStyleChange={(s) => visualizerRef.current?.setTrailStyle(s)}
        onTrailCurveChange={(c) => visualizerRef.current?.setTrailCurve(c)}
        onWireframeChange={(v) => visualizerRef.current?.setWireframe(v)}
      />

      {isLoaded ? (
        <div className="absolute top-4 right-4 flex flex-col items-stretch gap-2 z-10 w-72">
          {buttons}
          <p className="text-slate-400 text-xs text-right mt-1">{status}</p>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
          <div className="flex flex-col items-stretch gap-2 w-72">
            {buttons}
          </div>
          <p className="text-slate-400 text-sm mt-3">{status}</p>
        </div>
      )}
    </div>
  )
}
