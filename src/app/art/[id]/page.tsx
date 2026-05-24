import { notFound } from 'next/navigation'
import { loadArtwork } from '@/lib/artwork-storage'
import { ArtworkViewer } from '@/components/ArtworkViewer'

export default async function ArtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await loadArtwork(id)
  if (!data) notFound()
  return <ArtworkViewer data={data} />
}
