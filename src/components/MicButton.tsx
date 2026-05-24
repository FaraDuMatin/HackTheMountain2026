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
    <div className="flex flex-col items-stretch gap-2 w-full">
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition duration-300 [box-shadow:0_0_12px_2px_rgba(59,130,246,0.25),0_4px_6px_-1px_rgba(0,0,0,0.4)] select-none disabled:opacity-50 cursor-pointer border ${
          isActive
            ? 'bg-emerald-700/40 hover:bg-emerald-700/60 border-emerald-500/60 text-emerald-100'
            : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-300 hover:text-slate-100'
        }`}
      >
        <span className="text-base">🎤</span>
        <span>{isLoading ? 'Requesting mic…' : isActive ? 'Mic On' : 'Use Microphone'}</span>
      </button>
      {isActive && (
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg px-3 py-1.5">
          <span className="text-slate-400 text-xs">Sensitivity</span>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={gain}
            onChange={e => onGainChange(parseFloat(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <span className="text-slate-300 text-xs font-mono w-10 text-right">{gain.toFixed(1)}x</span>
        </div>
      )}
    </div>
  )
}
