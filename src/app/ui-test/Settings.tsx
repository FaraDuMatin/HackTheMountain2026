'use client'

import { useState } from 'react'

interface SettingsProps {
  onCameraSpeedChange?: (speed: number) => void
}

export function Settings({ onCameraSpeedChange }: SettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [cameraSpeed, setCameraSpeed] = useState(0.2)

  const handleSpeedChange = (value: number) => {
    setCameraSpeed(value)
    onCameraSpeedChange?.(value)
  }

  return (
    <div className="fixed left-4 top-4 z-20 flex items-start gap-3">
      {/* Settings Panel */}
      {isOpen && (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 w-72 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-slate-100 font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
              <span className="text-lg">⚙️</span> Observation
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 transition p-1 hover:bg-slate-700/50 rounded"
            >
              ✕
            </button>
          </div>

          {/* Camera Speed Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                Camera Speed
              </label>
              <span className="text-cyan-400 text-xs font-mono font-bold bg-slate-800/80 px-2 py-1 rounded">
                {cameraSpeed.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={cameraSpeed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition"
            />
            <div className="flex gap-2 text-[10px] text-slate-500">
              <span>0.05</span>
              <span className="flex-1"></span>
              <span>1.00</span>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`mt-1 p-2.5 rounded-lg transition duration-300 shadow-lg flex items-center justify-center ${
          isOpen
            ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
            : 'bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-slate-100'
        }`}
        title={isOpen ? 'Close settings' : 'Open settings'}
      >
        <span className="text-lg">⚙️</span>
      </button>
    </div>
  )
}

