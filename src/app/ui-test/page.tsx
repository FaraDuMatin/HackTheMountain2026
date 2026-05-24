

'use client'

import { useRef, useEffect, useCallback, useState, useTransition } from 'react'
import { uploadAudio } from '../actions'
import { setupAudioAnalyser, setupAudioAnalyserFromUrl, type AudioSetup } from '@/lib/util'
import { startFFT3DVisualizer } from '@/lib/3d-visualization'
import { Settings } from './Settings'

const DEFAULT_SONG = '/default.mp3'

export default function UITestPage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const stopVisualizerRef = useRef<{ stop: () => void } | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [status, setStatus] = useState('Press P to play default song, or upload an MP3')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const startVisualizer = useCallback((setup: AudioSetup) => {
    contextRef.current = setup.context
    audioRef.current = setup.audio
    if (mountRef.current) {
      stopVisualizerRef.current?.stop()
      stopVisualizerRef.current = startFFT3DVisualizer(setup.analyser, mountRef.current, setup.audio)
    }
    setIsLoaded(true)
    setStatus('Playing — P to pause | click scene to look around | WASD to move')
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    stopVisualizerRef.current?.stop()
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
      stopVisualizerRef.current?.stop()
      audioRef.current?.pause()
      contextRef.current?.close()
    }
  }, [startVisualizer])

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    const file = files?.[0]
    if (file && file.type === 'audio/mpeg') {
      const event = new Event('change', { bubbles: true })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      if (input) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }

  const uploadButtonSmall = (
    <label className="flex items-center justify-center p-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-slate-100 rounded-lg cursor-pointer transition duration-300 shadow-lg select-none" title={isPending ? 'Processing…' : 'Upload MP3'}>
      <input
        type="file"
        accept=".mp3,audio/mpeg"
        className="hidden"
        onChange={handleFileChange}
        disabled={isPending}
      />
      <span className="text-xl">{isPending ? '⏳' : '📤'}</span>
    </label>
  )

  const dropZone = (
    <label 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col items-center justify-center gap-6 p-12 border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-xl cursor-pointer transition duration-300 bg-slate-800/30 hover:bg-slate-800/50"
    >
      <input
        type="file"
        accept=".mp3,audio/mpeg"
        className="hidden"
        onChange={handleFileChange}
        disabled={isPending}
      />
      <span className="text-6xl">📤</span>
      <div className="text-center">
        <p className="text-slate-200 font-semibold text-lg mb-1">Drag & Drop your MP3</p>
        <p className="text-slate-400 text-sm">or click to browse</p>
      </div>
      {isPending && <p className="text-cyan-400 text-sm font-mono">Processing…</p>}
    </label>
  )

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      <div ref={mountRef} className="absolute inset-0" />

      {/* Settings Component */}
      <Settings onCameraSpeedChange={(speed) => console.log('Camera speed:', speed)} />

      {/* Upload Button - Top Right (only when loaded) */}
      {isLoaded && (
        <div className="fixed right-4 top-4 z-20">
          {uploadButtonSmall}
        </div>
      )}

      {isLoaded ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <p className="text-zinc-400 text-xs">{status}</p>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 p-8">
          <div className="w-full max-w-2xl">
            {dropZone}
          </div>
          <p className="text-zinc-400 text-sm mt-4">{status}</p>
        </div>
      )}
    </div>
  )
}