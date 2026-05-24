'use client'

interface Props {
  isActive: boolean
  isLoading: boolean
  gain: number
  onToggle: () => void
  onGainChange: (gain: number) => void
}

export function MicButton({ isActive, isLoading, gain, onToggle, onGainChange }: Props) {
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg text-white text-sm transition select-none shadow-lg disabled:opacity-50 cursor-pointer ${
          isActive
            ? 'bg-emerald-600 hover:bg-emerald-700'
            : 'bg-zinc-700 hover:bg-zinc-600'
        }`}
      >
        {isLoading ? 'Requesting mic…' : isActive ? 'Mic On' : 'Use Microphone'}
      </button>
      {isActive && (
        <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur rounded-lg px-3 py-1.5">
          <span className="text-zinc-400 text-xs">Sensitivity</span>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={gain}
            onChange={e => onGainChange(parseFloat(e.target.value))}
            className="w-24 accent-emerald-500"
          />
          <span className="text-zinc-400 text-xs w-8">{gain.toFixed(1)}x</span>
        </div>
      )}
    </div>
  )
}
