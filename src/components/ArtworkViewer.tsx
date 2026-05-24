'use client'

import { useEffect, useRef } from 'react'
import { renderStaticArtwork } from '@/lib/static-viewer'
import type { ArtworkData } from '@/lib/artwork-data'

interface Props {
  data: ArtworkData
}

export function ArtworkViewer({ data }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mountRef.current) return
    const dispose = renderStaticArtwork(mountRef.current, data)
    return dispose
  }, [data])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute top-4 left-4 z-10 bg-zinc-900/80 backdrop-blur rounded-lg px-3 py-2 shadow-lg">
        <p className="text-zinc-300 text-sm">Captured artwork</p>
        <p className="text-zinc-500 text-xs">click scene to look around · WASD to move</p>
      </div>
    </div>
  )
}
