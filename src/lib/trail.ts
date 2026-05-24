import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

export type TrailStyle = 'line' | 'ribbon' | 'particles'
export type TrailCurve = 'straight' | 'curved'

export type TrailSnapshot = {
  positions: number[]
  colors: number[]
  style: TrailStyle
}

export type Trail = {
  extend(position: THREE.Vector3, color: THREE.Color): void
  setMaxPoints(n: number): void
  setStyle(style: TrailStyle): void
  setCurve(curve: TrailCurve): void
  isFull(): boolean
  snapshot(): TrailSnapshot
  dispose(): void
}

type TrailOptions = {
  maxPoints: number    // pre-allocated buffer size — hard ceiling
  initialCap?: number  // starting visible cap (defaults to maxPoints)
  blending?: THREE.Blending
  style?: TrailStyle
  curve?: TrailCurve
}

// Sub-vertices per control-point segment when curve='curved'. Higher = smoother
// arcs but more vertices uploaded per emit. 8 looks visually smooth.
const CURVE_SUBDIV = 8

// Ribbon thickness in screen pixels (Line2 worldUnits=false).
const RIBBON_LINEWIDTH = 4

// Particle sizes (world units, sizeAttenuation=true). Glow trail gets a larger
// size to match the existing pointCloud/glowCloud visual hierarchy.
const PARTICLE_SIZE_MAIN = 0.8
const PARTICLE_SIZE_GLOW = 2.0

type MeshAdapter = {
  update(positions: Float32Array, colors: Float32Array, count: number): void
  dispose(): void
}

export function createTrail(scene: THREE.Scene, opts: TrailOptions): Trail {
  // Control points: one entry per extend() call. The "raw" emitted path.
  const controlPositions = new Float32Array(opts.maxPoints * 3)
  const controlColors = new Float32Array(opts.maxPoints * 3)
  let controlCount = 0
  let cap = opts.initialCap ?? opts.maxPoints

  let style: TrailStyle = opts.style ?? 'line'
  let curveMode: TrailCurve = opts.curve ?? 'straight'

  // Render buffers: what actually gets uploaded to the GPU. When curve='curved'
  // these hold the densified curve samples (up to CURVE_SUBDIV× control count).
  const renderCapacity = opts.maxPoints * CURVE_SUBDIV
  const renderPositions = new Float32Array(renderCapacity * 3)
  const renderColors = new Float32Array(renderCapacity * 3)
  let renderCount = 0

  const createLineAdapter = (): MeshAdapter => {
    const material = new THREE.LineBasicMaterial({ vertexColors: true })
    if (opts.blending) {
      material.blending = opts.blending
      material.transparent = true
      material.depthWrite = false
    }

    const line = new THREE.Line(new THREE.BufferGeometry(), material)
    line.frustumCulled = false
    scene.add(line)

    return {
      // Rebuild geometry on every update with a tightly-sized fresh
      // BufferAttribute. Avoids the stale-needsUpdate problem where a long-lived
      // shared buffer's GPU upload doesn't always reflect a grown drawRange.
      update(pos, col, count) {
        const oldGeo = line.geometry
        const newGeo = new THREE.BufferGeometry()
        if (count > 0) {
          const n = count * 3
          newGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos.subarray(0, n)), 3))
          newGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col.subarray(0, n)), 3))
        }
        line.geometry = newGeo
        oldGeo.dispose()
      },
      dispose() {
        scene.remove(line)
        line.geometry.dispose()
        material.dispose()
      },
    }
  }

  const createRibbonAdapter = (): MeshAdapter => {
    const geometry = new LineGeometry()
    const material = new LineMaterial({
      linewidth: RIBBON_LINEWIDTH,
      vertexColors: true,
      worldUnits: false,
    })
    if (opts.blending) {
      material.blending = opts.blending
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
    scene.add(line)

    return {
      update(pos, col, count) {
        if (count < 2) return  // Line2 needs at least two vertices
        const n = count * 3
        geometry.setPositions(Array.from(pos.subarray(0, n)))
        geometry.setColors(Array.from(col.subarray(0, n)))
      },
      dispose() {
        scene.remove(line)
        geometry.dispose()
        material.dispose()
        window.removeEventListener('resize', updateRes)
      },
    }
  }

  const createParticlesAdapter = (): MeshAdapter => {
    const material = new THREE.PointsMaterial({
      vertexColors: true,
      size: opts.blending ? PARTICLE_SIZE_GLOW : PARTICLE_SIZE_MAIN,
      sizeAttenuation: true,
    })
    if (opts.blending) {
      material.blending = opts.blending
      material.transparent = true
      material.depthWrite = false
    }

    const points = new THREE.Points(new THREE.BufferGeometry(), material)
    points.frustumCulled = false
    scene.add(points)

    return {
      update(pos, col, count) {
        const oldGeo = points.geometry
        const newGeo = new THREE.BufferGeometry()
        if (count > 0) {
          const n = count * 3
          newGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos.subarray(0, n)), 3))
          newGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col.subarray(0, n)), 3))
        }
        points.geometry = newGeo
        oldGeo.dispose()
      },
      dispose() {
        scene.remove(points)
        points.geometry.dispose()
        material.dispose()
      },
    }
  }

  const createAdapter = (s: TrailStyle): MeshAdapter => {
    if (s === 'ribbon') return createRibbonAdapter()
    if (s === 'particles') return createParticlesAdapter()
    return createLineAdapter()
  }

  let adapter = createAdapter(style)

  // Rebuild renderPositions/Colors from control points, applying smoothing if
  // curve='curved'. Called on every extend and on any setter change.
  const rebuild = () => {
    if (curveMode === 'straight' || controlCount < 2) {
      const n = controlCount * 3
      for (let i = 0; i < n; i++) {
        renderPositions[i] = controlPositions[i]
        renderColors[i] = controlColors[i]
      }
      renderCount = controlCount
    } else {
      // Sample a Catmull-Rom spline through the control points and interpolate
      // colors linearly between adjacent control colors along each sub-segment.
      const points: THREE.Vector3[] = new Array(controlCount)
      for (let i = 0; i < controlCount; i++) {
        points[i] = new THREE.Vector3(
          controlPositions[i * 3],
          controlPositions[i * 3 + 1],
          controlPositions[i * 3 + 2],
        )
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
      const totalSegments = (controlCount - 1) * CURVE_SUBDIV
      // getPoints(n) returns n+1 evenly-spaced samples
      const sampled = curve.getPoints(totalSegments)
      const denom = sampled.length - 1
      for (let k = 0; k < sampled.length; k++) {
        const tGlobal = denom > 0 ? (k / denom) * (controlCount - 1) : 0
        const i = Math.min(Math.floor(tGlobal), controlCount - 2)
        const local = tGlobal - i
        const inv = 1 - local
        renderPositions[k * 3]     = sampled[k].x
        renderPositions[k * 3 + 1] = sampled[k].y
        renderPositions[k * 3 + 2] = sampled[k].z
        renderColors[k * 3]     = controlColors[i * 3]     * inv + controlColors[(i + 1) * 3]     * local
        renderColors[k * 3 + 1] = controlColors[i * 3 + 1] * inv + controlColors[(i + 1) * 3 + 1] * local
        renderColors[k * 3 + 2] = controlColors[i * 3 + 2] * inv + controlColors[(i + 1) * 3 + 2] * local
      }
      renderCount = sampled.length
    }
    adapter.update(renderPositions, renderColors, renderCount)
  }

  return {
    extend(position, color) {
      if (controlCount >= cap) {
        // Sliding window: drop oldest control point.
        controlPositions.copyWithin(0, 3, cap * 3)
        controlColors.copyWithin(0, 3, cap * 3)
        controlCount = cap - 1
      }
      const i = controlCount * 3
      controlPositions[i]     = position.x
      controlPositions[i + 1] = position.y
      controlPositions[i + 2] = position.z
      controlColors[i]     = color.r
      controlColors[i + 1] = color.g
      controlColors[i + 2] = color.b
      controlCount++
      rebuild()
    },
    setMaxPoints(n) {
      cap = Math.max(2, Math.min(n, opts.maxPoints))
      if (controlCount > cap) controlCount = cap
      rebuild()
    },
    setStyle(s) {
      if (s === style) return
      style = s
      adapter.dispose()
      adapter = createAdapter(style)
      rebuild()
    },
    setCurve(c) {
      if (c === curveMode) return
      curveMode = c
      rebuild()
    },
    isFull() { return controlCount >= cap },
    snapshot() {
      const n = renderCount * 3
      return {
        positions: Array.from(renderPositions.subarray(0, n)),
        colors: Array.from(renderColors.subarray(0, n)),
        style,
      }
    },
    dispose() {
      adapter.dispose()
    },
  }
}
