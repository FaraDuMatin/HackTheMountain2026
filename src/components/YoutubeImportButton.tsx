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
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => setShowInput(v => !v)}
        disabled={disabled}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition select-none text-sm shadow-lg disabled:opacity-50 cursor-pointer"
      >
        {isPending ? 'Downloading…' : 'Import from YouTube'}
      </button>
      {showInput && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste YouTube URL…"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="px-3 py-2 rounded-lg bg-zinc-800 text-white text-sm border border-zinc-600 outline-none focus:border-red-500 w-56"
            autoFocus
          />
          <button
            onClick={submit}
            disabled={!url.trim()}
            className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
          >
            Go
          </button>
        </div>
      )}
    </div>
  )
}
