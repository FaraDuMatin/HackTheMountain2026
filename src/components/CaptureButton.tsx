'use client'

import { useState } from 'react'

interface Props {
  // Called on click. Returns the path to the shareable artwork page (e.g. /art/abc123)
  // or throws on failure.
  onCapture: () => Promise<string>
  disabled?: boolean
}

export function CaptureButton({ onCapture, disabled }: Props) {
  const [pending, setPending] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    if (pending) return
    setPending(true)
    setError(null)
    setCopied(false)
    try {
      const path = await onCapture()
      const absolute = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
      setShareUrl(absolute)
    } catch (err) {
      console.error('[CaptureButton] capture failed:', err)
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('[CaptureButton] copy failed:', err)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleClick}
        disabled={disabled || pending}
        className="px-4 py-2 rounded-lg text-white text-sm transition select-none shadow-lg disabled:opacity-50 cursor-pointer bg-amber-600 hover:bg-amber-700"
      >
        {pending ? 'Saving…' : 'Capture Artwork'}
      </button>

      {error && (
        <p className="text-red-400 text-xs max-w-xs text-right">{error}</p>
      )}

      {shareUrl && (
        <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur rounded-lg px-3 py-1.5 max-w-xs">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 text-xs underline truncate font-mono"
            title={shareUrl}
          >
            {shareUrl.replace(/^https?:\/\//, '')}
          </a>
          <button
            onClick={handleCopy}
            className="text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer shrink-0"
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
