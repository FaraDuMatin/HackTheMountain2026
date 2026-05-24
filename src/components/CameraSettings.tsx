'use client'

import { useState } from 'react'
import { DEFAULT_CAMERA_SPEED, DEFAULT_CAMERA_SENSITIVITY } from '@/lib/3d-scene'
import { DEFAULT_POINT_SIZE, DEFAULT_TRAIL_POINTS, TRAIL_BUFFER_SIZE } from '@/lib/3d-visualization'
import { type PointShape } from '@/lib/point-cloud'
import { PARTICLE_SIZE_MAIN, RIBBON_LINEWIDTH_MAIN, type TrailStyle, type TrailCurve } from '@/lib/trail'

const SHAPES: { value: PointShape; label: string }[] = [
  { value: 'sphere',       label: 'Sphere' },
  { value: 'dodecahedron', label: 'Dodeca' },
  { value: 'torus',        label: 'Torus' },
  { value: 'torusKnot',    label: 'Torus Knot' },
]

const STYLES: { value: TrailStyle; label: string }[] = [
  { value: 'line',      label: 'Line' },
  { value: 'ribbon',    label: 'Ribbon' },
  { value: 'particles', label: 'Particles' },
]

const CURVES: { value: TrailCurve; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'curved',   label: 'Curved' },
]

interface Props {
  onSpeedChange: (n: number) => void
  onSensitivityChange: (n: number) => void
  onTrailLengthChange: (n: number) => void
  onShapeChange: (shape: PointShape) => void
  onPointSizeChange: (n: number) => void
  onTrailStyleChange: (style: TrailStyle) => void
  onTrailCurveChange: (curve: TrailCurve) => void
  onRibbonWidthChange: (n: number) => void
  onParticleSizeChange: (n: number) => void
  onWireframeChange: (v: boolean) => void
}

export function CameraSettings({
  onSpeedChange,
  onSensitivityChange,
  onTrailLengthChange,
  onShapeChange,
  onPointSizeChange,
  onTrailStyleChange,
  onTrailCurveChange,
  onRibbonWidthChange,
  onParticleSizeChange,
  onWireframeChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [speed, setSpeed] = useState(DEFAULT_CAMERA_SPEED)
  const [sensitivity, setSensitivity] = useState(DEFAULT_CAMERA_SENSITIVITY)
  const [trailLength, setTrailLength] = useState(DEFAULT_TRAIL_POINTS)
  const [shape, setShape] = useState<PointShape>('sphere')
  const [pointSize, setPointSize] = useState(DEFAULT_POINT_SIZE)
  const [trailStyle, setTrailStyle] = useState<TrailStyle>('line')
  const [trailCurve, setTrailCurve] = useState<TrailCurve>('straight')
  const [ribbonWidth, setRibbonWidth] = useState(RIBBON_LINEWIDTH_MAIN)
  const [particleSize, setParticleSize] = useState(PARTICLE_SIZE_MAIN)
  const [showWireframe, setShowWireframe] = useState(false)

  const handleSpeed = (n: number) => {
    setSpeed(n)
    onSpeedChange(n)
  }
  const handleSensitivity = (n: number) => {
    setSensitivity(n)
    onSensitivityChange(n)
  }
  const handleTrailLength = (n: number) => {
    setTrailLength(n)
    onTrailLengthChange(n)
  }
  const handleShape = (s: PointShape) => {
    setShape(s)
    onShapeChange(s)
  }
  const handlePointSize = (n: number) => {
    setPointSize(n)
    onPointSizeChange(n)
  }
  const handleTrailStyle = (s: TrailStyle) => {
    setTrailStyle(s)
    onTrailStyleChange(s)
  }
  const handleTrailCurve = (c: TrailCurve) => {
    setTrailCurve(c)
    onTrailCurveChange(c)
  }
  const handleRibbonWidth = (n: number) => {
    setRibbonWidth(n)
    onRibbonWidthChange(n)
  }
  const handleParticleSize = (n: number) => {
    setParticleSize(n)
    onParticleSizeChange(n)
  }
  const handleWireframe = (v: boolean) => {
    setShowWireframe(v)
    onWireframeChange(v)
  }

  return (
    <div className="fixed left-4 top-4 z-20 flex items-start gap-3">
      {isOpen && (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 w-72 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-100 font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
              <span className="text-lg">⚙️</span> Camera
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 transition p-1 hover:bg-slate-700/50 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                  Movement Speed
                </label>
                <span className="text-cyan-400 text-xs font-mono font-bold bg-slate-800/80 px-2 py-1 rounded">
                  {speed.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={3}
                step={0.05}
                value={speed}
                onChange={e => handleSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                  Mouse Sensitivity
                </label>
                <span className="text-cyan-400 text-xs font-mono font-bold bg-slate-800/80 px-2 py-1 rounded">
                  {sensitivity.toFixed(4)}
                </span>
              </div>
              <input
                type="range"
                min={0.0005}
                max={0.01}
                step={0.0005}
                value={sensitivity}
                onChange={e => handleSensitivity(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                  Trail Length
                </label>
                <span className="text-cyan-400 text-xs font-mono font-bold bg-slate-800/80 px-2 py-1 rounded">
                  {trailLength}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={TRAIL_BUFFER_SIZE}
                step={10}
                value={trailLength}
                onChange={e => handleTrailLength(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                  Point Size
                </label>
                <span className="text-cyan-400 text-xs font-mono font-bold bg-slate-800/80 px-2 py-1 rounded">
                  {pointSize.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={10}
                step={0.1}
                value={pointSize}
                onChange={e => handlePointSize(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                  Ribbon Width
                </label>
                <span className="text-cyan-400 text-xs font-mono font-bold bg-slate-800/80 px-2 py-1 rounded">
                  {ribbonWidth.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={ribbonWidth}
                onChange={e => handleRibbonWidth(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                  Particle Size
                </label>
                <span className="text-cyan-400 text-xs font-mono font-bold bg-slate-800/80 px-2 py-1 rounded">
                  {particleSize.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={6}
                step={0.1}
                value={particleSize}
                onChange={e => handleParticleSize(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                Point Shape
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {SHAPES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => handleShape(s.value)}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition duration-200 border cursor-pointer ${
                      shape === s.value
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                Trail Style
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {STYLES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => handleTrailStyle(s.value)}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition duration-200 border cursor-pointer ${
                      trailStyle === s.value
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                Trail Curve
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {CURVES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => handleTrailCurve(c.value)}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition duration-200 border cursor-pointer ${
                      trailCurve === c.value
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                Wireframe
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {([false, true] as const).map(v => (
                  <button
                    key={String(v)}
                    onClick={() => handleWireframe(v)}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition duration-200 border cursor-pointer ${
                      showWireframe === v
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {v ? 'On' : 'Off'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(v => !v)}
        className={`mt-1 p-2.5 rounded-lg transition duration-300 [box-shadow:0_0_12px_2px_rgba(59,130,246,0.25),0_4px_6px_-1px_rgba(0,0,0,0.4)] flex items-center justify-center cursor-pointer ${
          isOpen
            ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
            : 'bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-slate-100'
        }`}
        title={isOpen ? 'Close camera settings' : 'Open camera settings'}
      >
        <span className="text-lg">⚙️</span>
      </button>
    </div>
  )
}
