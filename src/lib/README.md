# Audio Visualizer Library

This folder holds the building blocks for the 3D audio point cloud visualization. Each file has **one job**, so you can swap any piece (e.g. how points are colored, where they appear) without touching the rest.

## The pipeline

```
FFT array (Uint8Array, 128 bins)
   │
   ▼
[audio-features.ts] ──► { bass, mid, high }  (each 0–1)
   │
   ├──► [spatial-mapping.ts] ──► Vector3 position
   │
   └──► [color-mapping.ts]   ──► Color
                                   │
                                   ▼
                          [point-cloud.ts] ──► renders a sphere at (pos, color)
                                                that fades out over 5 seconds
```

`3d-visualization.ts` is the conductor — it sets up the Three.js scene and wires the four files together.

---

## `audio-features.ts`

Extracts three numbers from a raw FFT frame.

```ts
type AudioFeatures = { bass: number; mid: number; high: number }  // each 0–1
function extractFeatures(fft: Uint8Array): AudioFeatures
```

**How it works:** averages slices of the FFT array, then divides by 255 to get a 0–1 value.

| Band | Bin range | Frequency range (approx) |
|---|---|---|
| `bass` | 0–3 | 0 – 1 kHz |
| `mid`  | 3–15 | 1 – 5 kHz |
| `high` | 15–128 | 5 – 22 kHz |

Why these ranges? With `fftSize = 256`, each bin is ~344 Hz wide. Bass instruments and the fundamental of most male vocals live below 1 kHz; speech and most melodic content sits in the mids; cymbals, sibilants, and air sit in the highs.

**To change:** edit the bin boundaries inside `extractFeatures()`. Could also add new features (`amplitude`, `spectralCentroid`) and have other files use them.

---

## `spatial-mapping.ts`

Decides **where** in 3D space a point appears, given the current audio features.

```ts
type SpatialMapper = (features: AudioFeatures, elapsedSec: number) => THREE.Vector3
const directMapper: SpatialMapper  // active
const timeMapper: SpatialMapper    // fallback — tape that scrolls along X
```

**`directMapper` (active)** maps each frequency band to one axis, centered around origin:

```
X = (bass − 0.5) × 80 + jitter
Y = (mid  − 0.5) × 80 + jitter
Z = (high − 0.5) × 80 + jitter
```

Spawn region is `[-40, 40]³`. Quiet bands push points to the negative side, loud bands push them positive. A random ±7.5 unit jitter prevents identical frames from stacking on the same pixel.

**Tuning knobs** at the top of `spatial-mapping.ts`:
- `SCALE = 80` — how big the cube gets
- `JITTER = 15` — spread around the audio's actual cluster center (the most useful knob; bass/mid/high in real music are highly correlated so adding noise is what actually makes the cloud look full)

**`timeMapper`** is still exported as an alternative — X grows with elapsed time, Y/Z from mid/high. Use it if you want a "tape" through space instead of a static cube.

**To swap mappers:** in `3d-visualization.ts`, change `import { directMapper }` to your chosen mapper, and update the call inside `draw()`.

---

## `color-mapping.ts`

Decides **what color** a point gets, given the current audio features.

```ts
type ColorMapper = (features: AudioFeatures) => THREE.Color
const rgbFromFeaturesMapper: ColorMapper  // R=bass, G=mid, B=high
const bassHueMapper: ColorMapper          // active — hue shifts blue→red with bass
```

- `rgbFromFeaturesMapper`: maps each band to one RGB channel. Bass-heavy songs look red; high-heavy songs look blue.
- `bassHueMapper`: bass alone drives hue. Low bass = blue (hue 0.65), high bass = red (hue 0.0). Saturation and lightness stay fixed so the color stays vivid.

**To swap:** in `3d-visualization.ts`, change the import and the call inside `draw()`.

**To add a new one:** export a new function of type `ColorMapper`. The shape of the file makes adding strategies trivial.

---

## `point-cloud.ts`

The rendering system. Owns a pool of sphere instances and manages emission, aging, and fade.

```ts
type PointCloudSystem = {
  emit(position: Vector3, color: Color): void
  update(deltaSec: number): void
  dispose(): void
}

function createPointCloud(scene: THREE.Scene, opts: {
  maxPoints: number     // pool size
  lifetimeSec: number   // how long each point lives
  pointSize: number     // base radius
}): PointCloudSystem
```

**How it works:**

1. Creates a single `THREE.InstancedMesh` of `maxPoints` spheres. One draw call for the whole cloud.
2. Maintains parallel arrays: `birthTime[i]`, `positions[i]`, `baseColors[i]`, `active[i]`.
3. **`emit(pos, color)`** — finds an inactive slot (or replaces the oldest active one), records birth time + position + color.
4. **`update(dt)`** — every frame, advances each active point's age. Computes `fade = 1 - age/lifetimeSec`:
   - Scale shrinks from `pointSize` to 0
   - Color is multiplied by `fade` (darkens against the black background → looks like transparency)
   - When `fade ≤ 0`, the slot is freed
5. **`dispose()`** — frees geometry, material, and removes from scene.

**Why color-darkening instead of real alpha?** Three.js `InstancedMesh.setColorAt` writes RGB only. Per-instance alpha would need a custom shader. On the dark background, multiplying RGB by `fade` is visually identical and free.

**Why `frustumCulled = false`?** Three.js computes an `InstancedMesh`'s bounding sphere from the initial instance matrices — but our instances start zero-scaled at origin, so the sphere is tiny and centered at `(0,0,0)`. When the camera moves such that origin falls outside the view frustum, Three.js would cull the *entire mesh*, making all points vanish even though actual points are scattered in `[-40, 40]³`. Disabling culling is free at 200 instances.

**To tune:**
- More points on screen → increase `maxPoints`
- Points stay longer → increase `lifetimeSec`
- Bigger spheres → increase `pointSize`

---

## How `3d-visualization.ts` ties it together

Once per frame:

```ts
cameraController.update()

const isPlaying = analyser.context.state === 'running'
if (isPlaying) {
  analyser.getByteFrequencyData(dataArray)         // grab FFT

  if (frameCounter % 4 === 0) {                       // throttle to ~15/sec
    const features = extractFeatures(dataArray)       // audio-features.ts
    const position = directMapper(features, elapsed)  // spatial-mapping.ts
    const color = bassHueMapper(features)             // color-mapping.ts
    pointCloud.emit(position, color)                  // point-cloud.ts
  }
}

pointCloud.update(dt)                              // age + fade existing points
renderer.render(scene, camera)
```

**Why the `isPlaying` check?** When the user presses **P** to pause, `AudioContext.suspend()` is called — but `analyser.getByteFrequencyData()` keeps returning the last captured buffer indefinitely. Without this check, new points would keep spawning with stale audio data while the song is paused. Existing points continue to fade in real time even when paused, so the cloud cleanly empties over ~5 seconds.

**Want a totally different visual?** You don't need to rewrite the renderer. Just swap a mapper. The pipeline above always works.
