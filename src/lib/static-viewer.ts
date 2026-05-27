import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { createScene } from './3d-scene'
import type { ArtworkData, ArtworkTrail } from './artwork-data'

// Reconstructs the captured artwork in 3D from saved trail data. Used by
// /art/[id] — same scene chrome as the live visualizer (camera, helpers,
// WASD controls) but no audio, no point clouds, no trail growth.

// Must match the live visualizer's ribbon thickness / particle sizes so the
// captured artwork visually matches the live view.
const RIBBON_LINEWIDTH_MAIN = 4
const RIBBON_LINEWIDTH_GLOW = 8
const PARTICLE_SIZE_MAIN = 2.0
const PARTICLE_SIZE_GLOW = 4.0

type TrailRenderer = {
  object: THREE.Object3D
  dispose(): void
}

function buildTrail(trail: ArtworkTrail, blending: THREE.Blending | null): TrailRenderer {
  const style = trail.style ?? 'line'

  if (style === 'ribbon') {
    const geometry = new LineGeometry()
    if (trail.positions.length >= 6) {
      geometry.setPositions(trail.positions)
      geometry.setColors(trail.colors)
    }
    const material = new LineMaterial({
      linewidth: trail.ribbonWidth ?? (blending ? RIBBON_LINEWIDTH_GLOW : RIBBON_LINEWIDTH_MAIN),
      vertexColors: true,
      worldUnits: false,
    })
    if (blending) {
      material.blending = blending
      material.transparent = true
      material.depthWrite = false
    }
    const updateRes = () => {
      material.resolution.set(window.innerWidth, window.innerHeight)
    }
    updateRes()
    window.addEventListener('resize', updateRes)

    const line = new Line2(geometry, material)
    line.frustumCulled = false
    return {
      object: line,
      dispose() {
        geometry.dispose()
        material.dispose()
        window.removeEventListener('resize', updateRes)
      },
    }
  }

  if (style === 'particles') {
    const positions = new Float32Array(trail.positions)
    const colors = new Float32Array(trail.colors)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      vertexColors: true,
      size: trail.particleSize ?? (blending ? PARTICLE_SIZE_GLOW : PARTICLE_SIZE_MAIN),
      sizeAttenuation: true,
    })
    if (blending) {
      material.blending = blending
      material.transparent = true
      material.depthWrite = false
    }

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    return {
      object: points,
      dispose() {
        geometry.dispose()
        material.dispose()
      },
    }
  }

  // Default: thin line (also the fallback for legacy snapshots without `style`)
  const positions = new Float32Array(trail.positions)
  const colors = new Float32Array(trail.colors)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.LineBasicMaterial({ vertexColors: true })
  if (blending) {
    material.blending = blending
    material.transparent = true
    material.depthWrite = false
  }

  const line = new THREE.Line(geometry, material)
  line.frustumCulled = false
  return {
    object: line,
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}

export function renderStaticArtwork(mount: HTMLDivElement, data: ArtworkData): () => void {
  const { scene, camera, renderer, cameraController, dispose: disposeScene } = createScene(mount, {
    position: new THREE.Vector3(...data.camera.position),
    yaw: data.camera.yaw,
    pitch: data.camera.pitch,
  })

  const mainTrail = buildTrail(data.mainTrail, null)
  const glowTrail = buildTrail(data.glowTrail, THREE.AdditiveBlending)
  scene.add(mainTrail.object)
  scene.add(glowTrail.object)

  let animFrame: number
  const animate = () => {
    cameraController.update()
    renderer.render(scene, camera)
    animFrame = requestAnimationFrame(animate)
  }
  animate()

  return () => {
    cancelAnimationFrame(animFrame)
    scene.remove(mainTrail.object)
    scene.remove(glowTrail.object)
    mainTrail.dispose()
    glowTrail.dispose()
    disposeScene()
  }
}
