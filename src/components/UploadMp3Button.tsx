'use client'

import type { ChangeEvent } from 'react'

interface Props {
  disabled: boolean
  isPending: boolean
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
}

export function UploadMp3Button({ disabled, isPending, onFileChange }: Props) {
  return (
    <label
      className={`flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-slate-100 rounded-lg cursor-pointer transition duration-300 [box-shadow:0_0_12px_2px_rgba(59,130,246,0.25),0_4px_6px_-1px_rgba(0,0,0,0.4)] select-none text-sm ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      title={isPending ? 'Processing…' : 'Upload MP3'}
    >
      <input
        type="file"
        accept=".mp3,audio/mpeg"
        className="hidden"
        onChange={onFileChange}
        disabled={disabled}
      />
      <span className="text-base">{isPending ? '⏳' : '📤'}</span>
      <span>{isPending ? 'Processing…' : 'Upload MP3'}</span>
    </label>
  )
}
