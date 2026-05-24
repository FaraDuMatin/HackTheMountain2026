'use client'

import { useState } from 'react'

interface Props {
  disabled: boolean
  isPending: boolean
  onSubmit: (url: string) => void
}

export function YoutubeImportButton({ disabled, isPending, onSubmit }: Props) {
  const [showInput, setShowInput] = useState(false)
  const [url, setUrl] = useState('')

  const submit = () => {
    const trimmed = url.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setShowInput(false)
    setUrl('')
  }

  return (
    <div className="flex flex-col items-stretch gap-2 w-full">
      <button
        onClick={() => setShowInput(v => !v)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-slate-100 rounded-lg transition duration-300 [box-shadow:0_0_12px_2px_rgba(59,130,246,0.25),0_4px_6px_-1px_rgba(0,0,0,0.4)] select-none text-sm disabled:opacity-50 cursor-pointer"
      >
        <span className="text-base">📺</span>
        <span>{isPending ? 'Downloading…' : 'Import from YouTube'}</span>
      </button>
      {showInput && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste YouTube URL…"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-100 text-sm border border-slate-600 outline-none focus:border-slate-400 placeholder-slate-500"
            autoFocus
          />
          <button
            onClick={submit}
            disabled={!url.trim()}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-slate-100 rounded-lg text-sm transition [box-shadow:0_0_12px_2px_rgba(59,130,246,0.25),0_4px_6px_-1px_rgba(0,0,0,0.4)] disabled:opacity-50 cursor-pointer"
          >
            Go
          </button>
        </div>
      )}
    </div>
  )
}
