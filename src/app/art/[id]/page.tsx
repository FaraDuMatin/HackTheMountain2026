import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadArtwork } from '@/lib/artwork-storage'
import { ArtworkViewer } from '@/components/ArtworkViewer'

type RouteParams = { id: string }

export async function generateMetadata(
  { params }: { params: Promise<RouteParams> },
): Promise<Metadata> {
  const { id } = await params
  const data = await loadArtwork(id)
  if (!data) {
    return {
      title: 'Artwork not found — SightHearing',
      description: 'This artwork link is invalid or has expired.',
    }
  }

  const mainVerts = data.mainTrail.positions.length / 3
  const glowVerts = data.glowTrail.positions.length / 3
  const totalVerts = mainVerts + glowVerts
  const date = new Date(data.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  const title = `Artwork #${id} — SightHearing`
  const description = `A 3D sound-painting captured on ${date} — ${totalVerts.toLocaleString()} vertices. Fly through it and make your own.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: data.createdAt,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ArtPage({ params }: { params: Promise<RouteParams> }) {
  const { id } = await params
  const data = await loadArtwork(id)
  if (!data) notFound()
  return <ArtworkViewer data={data} />
}
