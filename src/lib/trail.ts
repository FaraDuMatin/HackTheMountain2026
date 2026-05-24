import * as THREE from 'three'

export type TrailSnapshot = {
  positions: number[]
  colors: number[]
}

export type Trail = {
  extend(position: THREE.Vector3, color: THREE.Color): void
  setMaxPoints(n: number): void
  isFull(): boolean
  snapshot(): TrailSnapshot
  dispose(): void
}

type TrailOptions = {
  maxPoints: number    // pre-allocated buffer size — hard ceiling
  initialCap?: number  // starting visible cap (defaults to maxPoints)
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
  let cap = opts.initialCap ?? opts.maxPoints

  return {
    extend(position, color) {
      if (count >= cap) {
        // Sliding window: drop oldest vertex by shifting left by one vec3.
        positions.copyWithin(0, 3, cap * 3)
        colors.copyWithin(0, 3, cap * 3)
        count = cap - 1
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
    setMaxPoints(n) {
      cap = Math.max(2, Math.min(n, opts.maxPoints))
      if (count > cap) {
        count = cap
        geometry.setDrawRange(0, count)
      }
    },
    isFull() { return count >= cap },
    snapshot() {
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
