'use client'

import { useRef, useEffect, useCallback, useState, useTransition } from 'react'
import { uploadAudio } from './actions'
import { setupAudioAnalyser, setupAudioAnalyserFromUrl, type AudioSetup } from '@/lib/util'
import { startFFT3DVisualizer } from '@/lib/3d-visualization'

const DEFAULT_SONG = '/default.mp3'

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null)
  const stopVisualizerRef = useRef<(() => void) | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [status, setStatus] = useState('Press P to play default song, or upload an MP3')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const startVisualizer = useCallback((setup: AudioSetup) => {
    contextRef.current = setup.context
    audioRef.current = setup.audio
    if (mountRef.current) {
      stopVisualizerRef.current?.()
      stopVisualizerRef.current = startFFT3DVisualizer(setup.analyser, mountRef.current, setup.audio)
    }
    setIsLoaded(true)
    setStatus('Playing — P to pause | click scene to look around | WASD to move')
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    stopVisualizerRef.current?.()
    audioRef.current?.pause()
    contextRef.current?.close()
    setStatus('Uploading to server…')

    const formData = new FormData()
    formData.append('audio', file)

    startTransition(async () => {
      console.log(`[page] Sending to server: "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

      let base64: string
      try {
        base64 = await uploadAudio(formData)
        console.log('[page] Server action succeeded, decoding audio…')
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
  }, [startVisualizer])

  useEffect(() => {
    const handleKey = async (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'p') return

      const audio = audioRef.current

      // No audio loaded yet — start the default song
      if (!audio) {
        setStatus('Loading default song…')
        try {
          const setup = await setupAudioAnalyserFromUrl(DEFAULT_SONG)
          startVisualizer(setup)
        } catch (err) {
          console.error('[page] Failed to load default song:', err)
          setStatus(`Failed to load default song: ${(err as Error).message}`)
        }
        return
      }

      // Audio already loaded — toggle pause/play on the <audio> element.
      // This also updates Chrome's tab media controls.
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
      stopVisualizerRef.current?.()
      audioRef.current?.pause()
      contextRef.current?.close()
    }
  }, [startVisualizer])

  const uploadButton = (
    <label className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition select-none text-sm shadow-lg">
      <input
        type="file"
        accept=".mp3,audio/mpeg"
        className="hidden"
        onChange={handleFileChange}
        disabled={isPending}
      />
      {isPending ? 'Processing…' : 'Upload MP3'}
    </label>
  )

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      <div ref={mountRef} className="absolute inset-0" />

      {isLoaded ? (
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
          {uploadButton}
          <p className="text-zinc-400 text-xs text-right">{status}</p>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          {uploadButton}
          <p className="text-zinc-400 text-sm">{status}</p>
        </div>
      )}
    </div>
  )
}
