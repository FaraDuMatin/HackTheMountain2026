import * as THREE from 'three'

export type TrailSnapshot = {
  positions: number[]
  colors: number[]
}

export type Trail = {
  extend(position: THREE.Vector3, color: THREE.Color): void
  isFull(): boolean
  snapshot(): TrailSnapshot
  dispose(): void
}

type TrailOptions = {
  maxPoints: number
  blending?: THREE.Blending
}

export function createTrail(scene: THREE.Scene, opts: TrailOptions): Trail {
  const positions = new Float32Array(opts.maxPoints * 3)
  const colors = new Float32Array(opts.maxPoints * 3)

  const geometry = new THREE.BufferGeometry()
  const posAttr = new THREE.BufferAttribute(positions, 3)
  const colAttr = new THREE.BufferAttribute(colors, 3)
  posAttr.setUsage(THREE.DynamicDrawUsage)
  colAttr.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', posAttr)
  geometry.setAttribute('color', colAttr)
  geometry.setDrawRange(0, 0)

  const material = new THREE.LineBasicMaterial({ vertexColors: true })
  if (opts.blending) {
    material.blending = opts.blending
    material.transparent = true
    material.depthWrite = false
  }

  const line = new THREE.Line(geometry, material)
  // Partially-populated position buffers fool Three.js's auto bounding-sphere
  // calculation, causing the whole line to get culled at certain camera angles.
  line.frustumCulled = false
  scene.add(line)

  let count = 0

  return {
    extend(position, color) {
      if (count >= opts.maxPoints) {
        // Sliding window: drop the oldest vertex by shifting everything left by
        // 3 floats (one vec3). copyWithin is a single memmove call — fast even
        // for 5000+ vertices.
        positions.copyWithin(0, 3, opts.maxPoints * 3)
        colors.copyWithin(0, 3, opts.maxPoints * 3)
        count = opts.maxPoints - 1
      }
      const i = count * 3
      positions[i]     = position.x
      positions[i + 1] = position.y
      positions[i + 2] = position.z
      colors[i]     = color.r
      colors[i + 1] = color.g
      colors[i + 2] = color.b
      count++
      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
      geometry.setDrawRange(0, count)
    },
    isFull() { return count >= opts.maxPoints },
    snapshot() {
      // Plain arrays (not Float32Array) for JSON serialization. Slice off the
      // populated portion only — unpopulated slots are zeroes that would draw
      // a spurious line back to origin.
      const n = count * 3
      return {
        positions: Array.from(positions.subarray(0, n)),
        colors: Array.from(colors.subarray(0, n)),
      }
    },
    dispose() {
      scene.remove(line)
      geometry.dispose()
      material.dispose()
    },
  }
}
