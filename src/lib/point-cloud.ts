import * as THREE from 'three'

export type PointShape = 'sphere' | 'torus' | 'torusKnot' | 'dodecahedron'

export type PointCloudSystem = {
  emit(position: THREE.Vector3, color: THREE.Color): void
  update(deltaSec: number): void
  setShape(shape: PointShape): void
  setPointSize(size: number): void
  dispose(): void
}

type PointCloudOptions = {
  maxPoints: number
  lifetimeSec: number
  pointSize: number
  blending?: THREE.Blending
  shape?: PointShape
}

function makeGeometry(shape: PointShape): THREE.BufferGeometry {
  switch (shape) {
    case 'sphere':       return new THREE.SphereGeometry(1, 8, 8)
    case 'torus':        return new THREE.TorusGeometry(0.7, 0.3, 8, 16)
    case 'torusKnot':    return new THREE.TorusKnotGeometry(0.6, 0.2, 32, 8)
    case 'dodecahedron': return new THREE.DodecahedronGeometry(1)
  }
}

export function createPointCloud(scene: THREE.Scene, opts: PointCloudOptions): PointCloudSystem {
  let pointSize = opts.pointSize
  const material = new THREE.MeshBasicMaterial()
  if (opts.blending) {
    material.blending = opts.blending
    material.transparent = true
    material.depthWrite = false
  }

  let geometry = makeGeometry(opts.shape ?? 'sphere')
  let mesh = new THREE.InstancedMesh(geometry, material, opts.maxPoints)
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

        const s = fade * pointSize
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

    setShape(shape) {
      scene.remove(mesh)
      geometry.dispose()
      geometry = makeGeometry(shape)
      mesh = new THREE.InstancedMesh(geometry, material, opts.maxPoints)
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.frustumCulled = false
      for (let i = 0; i < opts.maxPoints; i++) mesh.setMatrixAt(i, zeroMatrix)
      mesh.instanceMatrix.needsUpdate = true
      active.fill(false)
      scene.add(mesh)
    },

    setPointSize(size) {
      pointSize = Math.max(0.01, size)
    },

    dispose() {
      scene.remove(mesh)
      geometry.dispose()
      material.dispose()
    },
  }
}
