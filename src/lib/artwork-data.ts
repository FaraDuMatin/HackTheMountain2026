// Serialized format for a captured artwork — read by /art/[id] page to
// reconstruct the 3D scene. Positions and colors are flat arrays of length
// (vertexCount * 3); each triple is one vec3.
export type ArtworkTrail = {
  positions: number[]
  colors: number[]
}

export type ArtworkData = {
  version: 1
  createdAt: string  // ISO timestamp
  mainTrail: ArtworkTrail
  glowTrail: ArtworkTrail
  camera: {
    position: [number, number, number]
    yaw: number
    pitch: number
  }
}
