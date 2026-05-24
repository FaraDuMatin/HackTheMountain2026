'use client'

import type { ChangeEvent } from 'react'

interface Props {
  disabled: boolean
  isPending: boolean
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
}

export function UploadMp3Button({ disabled, isPending, onFileChange }: Props) {
  return (
    <label className={`flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition select-none text-sm shadow-lg ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <input
        type="file"
        accept=".mp3,audio/mpeg"
        className="hidden"
        onChange={onFileChange}
        disabled={disabled}
      />
      {isPending ? 'Processing…' : 'Upload MP3'}
    </label>
  )
}
