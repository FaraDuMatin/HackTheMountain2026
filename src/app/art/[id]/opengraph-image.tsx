import { ImageResponse } from 'next/og'
import { loadArtwork } from '@/lib/artwork-storage'
import type { ArtworkTrail } from '@/lib/artwork-data'

export const runtime = 'nodejs'
export const alt = 'A 3D audio artwork'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Cap the number of points we draw per trail — Satori chokes on very long
// polylines, and the OG preview only needs to be recognizable, not exact.
const MAX_POINTS_PER_TRAIL = 400

type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

function computeBounds(trails: ArtworkTrail[]): Bounds {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const t of trails) {
    for (let i = 0; i < t.positions.length; i += 3) {
      const x = t.positions[i]
      const y = t.positions[i + 1]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (!Number.isFinite(minX)) return { minX: -50, maxX: 50, minY: -50, maxY: 50 }
  return { minX, maxX, minY, maxY }
}

function projectPolyline(trail: ArtworkTrail, bounds: Bounds, w: number, h: number): string {
  const total = trail.positions.length / 3
  if (total < 2) return ''
  const stride = Math.max(1, Math.floor(total / MAX_POINTS_PER_TRAIL))
  const rangeX = bounds.maxX - bounds.minX || 1
  const rangeY = bounds.maxY - bounds.minY || 1
  const pts: string[] = []
  for (let i = 0; i < trail.positions.length; i += stride * 3) {
    const px = ((trail.positions[i] - bounds.minX) / rangeX) * w
    const py = (1 - (trail.positions[i + 1] - bounds.minY) / rangeY) * h
    pts.push(`${px.toFixed(1)},${py.toFixed(1)}`)
  }
  return pts.join(' ')
}

function averageColor(trail: ArtworkTrail): string {
  const n = trail.colors.length / 3
  if (n === 0) return 'rgb(150,150,160)'
  let r = 0, g = 0, b = 0
  for (let i = 0; i < trail.colors.length; i += 3) {
    r += trail.colors[i]
    g += trail.colors[i + 1]
    b += trail.colors[i + 2]
  }
  return `rgb(${Math.round((r / n) * 255)},${Math.round((g / n) * 255)},${Math.round((b / n) * 255)})`
}

export default async function ArtworkOG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await loadArtwork(id)

  if (!data) {
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%',
          background: '#09090b', color: '#94a3b8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48, fontFamily: 'sans-serif',
        }}>
          Artwork not found
        </div>
      ),
      size,
    )
  }

  const bounds = computeBounds([data.mainTrail, data.glowTrail])
  const canvasW = 1120
  const canvasH = 470
  const mainPoints = projectPolyline(data.mainTrail, bounds, canvasW, canvasH)
  const glowPoints = projectPolyline(data.glowTrail, bounds, canvasW, canvasH)
  const mainColor = averageColor(data.mainTrail)
  const glowColor = averageColor(data.glowTrail)

  const totalVerts =
    data.mainTrail.positions.length / 3 + data.glowTrail.positions.length / 3

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        background: '#09090b',
        display: 'flex', flexDirection: 'column',
        padding: '40px',
        fontFamily: 'sans-serif',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <div style={{ color: '#e2e8f0', fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>
            SightHearing
          </div>
          <div style={{ color: '#64748b', fontSize: 22, fontFamily: 'monospace' }}>
            #{id}
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, marginTop: 20 }}>
          <svg width={canvasW} height={canvasH} viewBox={`0 0 ${canvasW} ${canvasH}`}>
            {glowPoints && (
              <polyline
                points={glowPoints}
                stroke={glowColor}
                strokeWidth={6}
                strokeOpacity={0.55}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {mainPoints && (
              <polyline
                points={mainPoints}
                stroke={mainColor}
                strokeWidth={3}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </svg>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          color: '#94a3b8', fontSize: 20,
        }}>
          <div style={{ display: 'flex' }}>{totalVerts.toLocaleString()} vertices</div>
          <div style={{ display: 'flex' }}>Sound, visualized.</div>
        </div>
      </div>
    ),
    size,
  )
}
