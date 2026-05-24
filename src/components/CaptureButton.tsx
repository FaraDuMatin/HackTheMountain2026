'use client'

import { useState, forwardRef } from 'react'

interface Props {
  onCapture: () => Promise<string>
  disabled?: boolean
}

export const CaptureButton = forwardRef<HTMLButtonElement, Props>(function CaptureButton({ onCapture, disabled }, ref) {
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
    <div className="flex flex-col items-stretch gap-2 w-full">
      <button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || pending}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-slate-100 rounded-lg text-sm transition duration-300 [box-shadow:0_0_12px_2px_rgba(59,130,246,0.25),0_4px_6px_-1px_rgba(0,0,0,0.4)] select-none disabled:opacity-50 cursor-pointer"
      >
        <span className="text-base">📸</span>
        <span>{pending ? 'Saving…' : 'Capture Artwork'}</span>
      </button>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      {shareUrl && (
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg px-3 py-1.5">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-slate-300 text-xs underline truncate font-mono"
            title={shareUrl}
          >
            {shareUrl.replace(/^https?:\/\//, '')}
          </a>
          <button
            onClick={handleCopy}
            className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer shrink-0"
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
})
