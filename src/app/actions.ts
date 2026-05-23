'use server'

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
