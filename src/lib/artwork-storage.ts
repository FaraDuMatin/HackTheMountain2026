import 'server-only'
import { put, list } from '@vercel/blob'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { ArtworkData } from './artwork-data'

// Hybrid storage: Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production /
// preview), local filesystem otherwise (dev). Filesystem fallback means heavy
// local testing doesn't touch cloud quota and works offline.
const BLOB_PREFIX = 'artwork/'
const LOCAL_DIR = path.join(process.cwd(), 'tmp', 'artworks')

function useBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export async function saveArtwork(id: string, data: ArtworkData): Promise<void> {
  const json = JSON.stringify(data)
  if (useBlobStorage()) {
    await put(`${BLOB_PREFIX}${id}.json`, json, {
      access: 'public',
      contentType: 'application/json',
    })
    return
  }
  await mkdir(LOCAL_DIR, { recursive: true })
  await writeFile(path.join(LOCAL_DIR, `${id}.json`), json, 'utf-8')
}

export async function loadArtwork(id: string): Promise<ArtworkData | null> {
  if (useBlobStorage()) {
    // Vercel Blob URLs include a random suffix, so we discover the actual URL
    // via prefix listing rather than constructing it ourselves.
    const { blobs } = await list({ prefix: `${BLOB_PREFIX}${id}.json`, limit: 1 })
    if (blobs.length === 0) return null
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as ArtworkData
  }
  try {
    const raw = await readFile(path.join(LOCAL_DIR, `${id}.json`), 'utf-8')
    return JSON.parse(raw) as ArtworkData
  } catch {
    return null
  }
}
