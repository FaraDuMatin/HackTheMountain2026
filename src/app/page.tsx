'use client'

import { useRef, useEffect, useCallback, useState, useTransition } from 'react'
import { uploadAudio, downloadFromYoutube } from './actions'
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
  const [showYtInput, setShowYtInput] = useState(false)
  const [ytUrl, setYtUrl] = useState('')
  const [isYtPending, setIsYtPending] = useState(false)

  const teardown = useCallback(() => {
    stopVisualizerRef.current?.()
    stopVisualizerRef.current = null  // prevent double-cleanup if startVisualizer calls it again
    audioRef.current?.pause()
    contextRef.current?.close()
  }, [])

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

    teardown()
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
  }, [teardown, startVisualizer])

  const handleYoutubeDownload = useCallback(async () => {
    const trimmed = ytUrl.trim()
    if (!trimmed) return

    teardown()
    setShowYtInput(false)
    setYtUrl('')
    setIsYtPending(true)
    // Render free tier cold-starts can take ~30s — let the user know
    setStatus('Contacting YouTube backend… (may take up to 30 s on first load)')

    let base64: string
    try {
      base64 = await downloadFromYoutube(trimmed)
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
  }, [ytUrl, teardown, startVisualizer])

  useEffect(() => {
    const handleKey = async (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'p') return

      const audio = audioRef.current

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
  }, [startVisualizer, teardown])

  const isBusy = isPending || isYtPending

  const uploadButton = (
    <label className={`flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition select-none text-sm shadow-lg ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}>
      <input
        type="file"
        accept=".mp3,audio/mpeg"
        className="hidden"
        onChange={handleFileChange}
        disabled={isBusy}
      />
      {isPending ? 'Processing…' : 'Upload MP3'}
    </label>
  )

  const youtubeSection = (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => setShowYtInput(v => !v)}
        disabled={isBusy}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition select-none text-sm shadow-lg disabled:opacity-50 cursor-pointer"
      >
        {isYtPending ? 'Downloading…' : 'Import from YouTube'}
      </button>
      {showYtInput && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste YouTube URL…"
            value={ytUrl}
            onChange={e => setYtUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleYoutubeDownload()}
            className="px-3 py-2 rounded-lg bg-zinc-800 text-white text-sm border border-zinc-600 outline-none focus:border-red-500 w-56"
            autoFocus
          />
          <button
            onClick={handleYoutubeDownload}
            disabled={!ytUrl.trim()}
            className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
          >
            Go
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      <div ref={mountRef} className="absolute inset-0" />

      {isLoaded ? (
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
          {uploadButton}
          {youtubeSection}
          <p className="text-zinc-400 text-xs text-right max-w-xs">{status}</p>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          {uploadButton}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setShowYtInput(v => !v)}
              disabled={isBusy}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition select-none text-sm shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isYtPending ? 'Downloading…' : 'Import from YouTube'}
            </button>
            {showYtInput && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste YouTube URL…"
                  value={ytUrl}
                  onChange={e => setYtUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleYoutubeDownload()}
                  className="px-3 py-2 rounded-lg bg-zinc-800 text-white text-sm border border-zinc-600 outline-none focus:border-red-500 w-56"
                  autoFocus
                />
                <button
                  onClick={handleYoutubeDownload}
                  disabled={!ytUrl.trim()}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
                >
                  Go
                </button>
              </div>
            )}
          </div>
          <p className="text-zinc-400 text-sm">{status}</p>
        </div>
      )}
    </div>
  )
}
