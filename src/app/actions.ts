'use server'

const YOUTUBE_BACKEND = 'https://backendtodeploytest.onrender.com'

export async function downloadFromYoutube(url: string): Promise<string> {
  console.log(`[downloadFromYoutube] Requesting: ${url}`)

  let response: Response
  try {
    response = await fetch(`${YOUTUBE_BACKEND}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  } catch (err) {
    console.error('[downloadFromYoutube] Network error reaching backend:', err)
    throw new Error(`Could not reach YouTube backend: ${(err as Error).message}`)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText)
    console.error(`[downloadFromYoutube] Backend returned ${response.status}: ${detail}`)
    throw new Error(`YouTube download failed (${response.status}): ${detail}`)
  }

  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  console.log(
    `[downloadFromYoutube] Got ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB → ` +
    `${(base64.length / 1024).toFixed(1)} KB base64`,
  )
  return base64
}

export async function uploadAudio(formData: FormData): Promise<string> {
  const file = formData.get('audio') as File | null

  if (!file) {
    console.error('[uploadAudio] No file received in FormData')
    throw new Error('No file received')
  }

  console.log(`[uploadAudio] Received file: "${file.name}" | type: ${file.type} | size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)

  if (file.type !== 'audio/mpeg') {
    console.error(`[uploadAudio] Wrong file type: ${file.type}`)
    throw new Error(`Expected audio/mpeg, got ${file.type}`)
  }

  try {
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    console.log(`[uploadAudio] Encoded to base64: ${(base64.length / 1024).toFixed(1)} KB`)
    return base64
  } catch (err) {
    console.error('[uploadAudio] Failed to read file buffer:', err)
    throw new Error(`Failed to read file: ${(err as Error).message}`)
  }
}
