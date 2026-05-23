import * as THREE from 'three'

export type PointCloudSystem = {
  emit(position: THREE.Vector3, color: THREE.Color): void
  update(deltaSec: number): void
  dispose(): void
}

type PointCloudOptions = {
  maxPoints: number
  lifetimeSec: number
  pointSize: number
}

export function createPointCloud(scene: THREE.Scene, opts: PointCloudOptions): PointCloudSystem {
  const geometry = new THREE.SphereGeometry(1, 12, 12)
  const material = new THREE.MeshBasicMaterial()
  const mesh = new THREE.InstancedMesh(geometry, material, opts.maxPoints)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  // Disable frustum culling: Three.js computes the bounding sphere from initial
  // (zero-scale at origin) instances, so the whole mesh gets culled when the
  // camera moves such that origin is off-screen — even though actual points
  // are scattered in [-40, 40]^3. 200 instances has zero perf cost.
  mesh.frustumCulled = false
  scene.add(mesh)

  // Parallel arrays for the point pool
  const birthTime = new Float32Array(opts.maxPoints)
  const positions: THREE.Vector3[] = Array.from({ length: opts.maxPoints }, () => new THREE.Vector3())
  const baseColors: THREE.Color[] = Array.from({ length: opts.maxPoints }, () => new THREE.Color())
  const active: boolean[] = new Array(opts.maxPoints).fill(false)

  // Zero-scale all instances initially so nothing renders
  const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0)
  for (let i = 0; i < opts.maxPoints; i++) mesh.setMatrixAt(i, zeroMatrix)
  mesh.instanceMatrix.needsUpdate = true

  let elapsedSec = 0
  const dummy = new THREE.Object3D()
  const tmpColor = new THREE.Color()

  const findSlot = (): number => {
    // Prefer an inactive slot
    for (let i = 0; i < opts.maxPoints; i++) if (!active[i]) return i
    // All active — replace the oldest
    let oldest = 0
    for (let i = 1; i < opts.maxPoints; i++) {
      if (birthTime[i] < birthTime[oldest]) oldest = i
    }
    return oldest
  }

  return {
    emit(position, color) {
      const i = findSlot()
      birthTime[i] = elapsedSec
      positions[i].copy(position)
      baseColors[i].copy(color)
      active[i] = true
    },

    update(deltaSec) {
      elapsedSec += deltaSec

      for (let i = 0; i < opts.maxPoints; i++) {
        if (!active[i]) continue

        const age = elapsedSec - birthTime[i]
        const fade = 1 - age / opts.lifetimeSec

        if (fade <= 0) {
          active[i] = false
          mesh.setMatrixAt(i, zeroMatrix)
          continue
        }

        const s = fade * opts.pointSize
        dummy.position.copy(positions[i])
        dummy.scale.set(s, s, s)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)

        tmpColor.copy(baseColors[i]).multiplyScalar(fade)
        mesh.setColorAt(i, tmpColor)
      }

      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    },

    dispose() {
      scene.remove(mesh)
      geometry.dispose()
      material.dispose()
    },
  }
}
