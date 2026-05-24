import * as THREE from 'three'
import { createScene } from './3d-scene'
import type { ArtworkData, ArtworkTrail } from './artwork-data'

// Reconstructs the captured artwork in 3D from saved trail data. Used by
// /art/[id] — same scene chrome as the live visualizer (camera, helpers,
// WASD controls) but no audio, no point clouds, no trail growth.

function buildLine(trail: ArtworkTrail, blending: THREE.Blending | null): THREE.Line {
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
  return line
}

export function renderStaticArtwork(mount: HTMLDivElement, data: ArtworkData): () => void {
  const { scene, camera, renderer, cameraController, dispose: disposeScene } = createScene(mount, {
    position: new THREE.Vector3(...data.camera.position),
    yaw: data.camera.yaw,
    pitch: data.camera.pitch,
  })

  const mainLine = buildLine(data.mainTrail, null)
  const glowLine = buildLine(data.glowTrail, THREE.AdditiveBlending)
  scene.add(mainLine)
  scene.add(glowLine)

  let animFrame: number
  const animate = () => {
    cameraController.update()
    renderer.render(scene, camera)
    animFrame = requestAnimationFrame(animate)
  }
  animate()

  return () => {
    cancelAnimationFrame(animFrame)
    scene.remove(mainLine)
    scene.remove(glowLine)
    mainLine.geometry.dispose()
    ;(mainLine.material as THREE.Material).dispose()
    glowLine.geometry.dispose()
    ;(glowLine.material as THREE.Material).dispose()
    disposeScene()
  }
}
