@AGENTS.md

## Project: Hack the Mountain 2026 — Audio FFT 3D Visualizer

### What this app does
Uploads an MP3 (or auto-loads a default song), computes real-time FFT via Web Audio API, and renders a reactive **3D point cloud** using Three.js. Each audio frame's bass/mid/high energy bands become a point's XYZ position (centered around origin in a `[-40, 40]³` cube). Bass also drives color (blue → red). Points fade out over 5 seconds.

### Key files
- `src/app/page.tsx` — main client component: file upload UI, P key handler, mounts the 3D scene
- `src/app/actions.ts` — server action: validates MP3, reads bytes, returns base64 string to client
- `src/lib/util.ts` — audio utilities: `NUM_FFT_POINTS`, `setupAudioAnalyser(base64)`, `setupAudioAnalyserFromUrl(url)`
- `src/lib/audio-features.ts` — pure function `extractFeatures(fft)` → `{ bass, mid, high }` (0–1)
- `src/lib/spatial-mapping.ts` — strategy functions: features → `THREE.Vector3` position. **Active: `directMapper`** (X = bass, Y = mid, Z = high, centered around origin, with jitter). `timeMapper` (tape along X) kept as a fallback option.
- `src/lib/color-mapping.ts` — strategy functions: features → `THREE.Color`. Currently exports `rgbFromFeaturesMapper` (R=bass, G=mid, B=high).
- `src/lib/point-cloud.ts` — Three.js point cloud system. `createPointCloud(scene, opts)` returns `{ emit, update, dispose }`. Manages a pool of `InstancedMesh` spheres with age-based fade.
- `src/lib/3d-visualization.ts` — scene/camera/renderer setup, camera controller, draw loop. Wires together the point cloud system + mappers.
- `public/default.mp3` — Dragon Ball GT Dan Dan Kokoro Hikareteku, auto-loaded on first P press

### Architecture decisions
- **FFT runs client-side only** (Web Audio API is browser-only). Server action handles upload/validation; decoding + analysis happens in the browser.
- `NUM_FFT_POINTS = 128` → `fftSize = 256`. Each bin covers ~344 Hz.
- **Point cloud over bars**: every 4 frames (~15/sec), emit a sphere whose position comes from the active spatial mapper. Lifetime 5 sec, fades via color-darkening + scale-to-zero.
- **Spatial mapping = direct XYZ (current)**: bands → axes, `(value − 0.5) × 80` + jitter. Spawn region is `[-40, 40]³` centered at origin. Polar/orbital was tried and scratched.
- **Modular mappers**: spatial and color mappings are isolated in their own files so they can be swapped (e.g. time → polar) without touching the renderer.
- **Pool size 200** sphere instances — stabilizes at ~75 active with current emission rate × lifetime.
- **No real per-instance alpha**: `InstancedMesh.setColorAt` is RGB only. Fade is simulated by multiplying RGB by `(1 - age/lifetime)` against the dark `#09090b` background, plus scale shrinking to 0.
- Camera controller is a plain function (not a class), returns `{ update, cleanup }`. Uses `requestPointerLock` for mouse look.

### Controls
- **P** — if no audio loaded: starts default song. If audio loaded: toggles pause/resume.
- **Click the 3D scene** — locks mouse pointer for look-around
- **WASD** — move camera forward/left/right/back
- **Space / Shift** — move camera up / down
- **Mouse** — look around (pitch + yaw, YXZ rotation order)

### Config
- `next.config.ts` sets `serverActions.bodySizeLimit: '50mb'` — needed because default is 1 MB and MP3s are larger.
- Next.js 16.2.6, React 19, Tailwind 4, Three.js installed.
- `reactCompiler: true` in next.config.ts.

### Every 3D related function for now is done in [this file](src/lib/3d-visualization.ts) and the helper modules `audio-features.ts`, `spatial-mapping.ts`, `color-mapping.ts`, `point-cloud.ts` (all in `src/lib/`)
