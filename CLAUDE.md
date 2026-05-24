@AGENTS.md

## Project: Hack the Mountain 2026 — Audio FFT 3D Visualizer

### What this app does
Turns sound into 3D artwork. Three input sources (MP3 upload, YouTube URL, live mic) feed a Web Audio FFT pipeline; each audio frame's bass/mid/high energy bands become a vertex in a persistent 3D line trail rendered with Three.js. The user can fly through the trail (WASD + mouse-look), then **capture** the artwork — the trail data is saved to Vercel Blob and reachable via a shareable `/art/{id}` URL.

### Inputs
- **MP3 upload** — server action validates + returns base64, browser decodes via Web Audio
- **YouTube URL** — `downloadFromYoutube` server action (external backend), same base64 flow
- **Live microphone** — `getUserMedia` + mic-only `AnalyserNode` for the glow layer
- **Default song** — `public/default.mp3` auto-loads on first P press if nothing else is playing

### Audio → visuals pipeline
1. Source feeds an `AnalyserNode` (`fftSize 256` → 128 bins, ~344 Hz each)
2. `extractFeatures(fft)` averages bins into `{ bass, mid, high }` ∈ [0,1]
3. `createNormalizedExtractor()` remaps each band via either a **preset** (`PRESET_NORM` for music, `PRESET_NORM_MIC` for mic — both currently enabled) or a rolling 150-sample window. Preset values are persisted in `localStorage` (`audio-norm-v1`, 7-day TTL) so calibration is warm across sessions.
4. `directMapper(features, t)` → `THREE.Vector3` (X = bass, Y = mid, Z = high, centered, with jitter) inside the `[-40, 40]³` cube
5. `bassHueMapper(features)` → `THREE.Color` (active color mapper; `rgbFromFeaturesMapper` is the alternate)
6. Two parallel rendering layers:
   - **`pointCloud`** — InstancedMesh pool, age-based fade (5 s lifetime, 200 instances). Geometry is runtime-swappable via `setShape`: `sphere | dodecahedron | torus | torusKnot`.
   - **`mainTrail`** — sliding window of control points (pre-allocated `TRAIL_BUFFER_SIZE=1000`, starting visible cap `DEFAULT_TRAIL_POINTS=50`). The control points feed a `MeshAdapter` selected by `setStyle`: `line` (`THREE.Line`, 1px), `ribbon` (`Line2` from three/examples, 4px screen-space, vertex colors), or `particles` (`THREE.Points`, world-space dots). Independently, `setCurve('curved')` densifies the path through a `CatmullRomCurve3` at 8× sub-vertices per control segment, with linear color interpolation between control colors.
7. When mic is active, a **separate mic-only analyser** drives:
   - `glowCloud` — additive-blended layer, same shape options as `pointCloud` (currently mirrored), pointSize 3.0, lifetime 2 s, 100 instances
   - `glowTrail` — additive variant of the trail, same style/curve as `mainTrail` (the visualizer always applies style/curve/shape changes to both layers)
   - Both gated by a noise-floor sum check (`micSum > 400`) so silence emits nothing
8. All visual parameters above are exposed in the ⚙️ **CameraSettings** panel (top-left): camera speed/sensitivity sliders, trail length slider, point-shape picker, trail-style picker, trail-curve picker.

### Capture & share
- `visualizerRef.current.snapshot()` returns `ArtworkData` (both trails as plain number arrays + per-trail `style` + camera position/yaw/pitch + version + timestamp). Curve mode is **baked into** the positions (densified samples), so it doesn't need to be stored separately. Point-shape is **not** stored — the static viewer doesn't render point clouds.
- `saveArtworkAction(data)` → `nanoid(10)` ID → `saveArtwork(id, data)` → returns ID
- Storage is **hybrid** (`src/lib/artwork-storage.ts`, `import 'server-only'`): Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set (or OIDC-injected `BLOB_STORE_ID` in production), local `./tmp/artworks/{id}.json` otherwise
- `/art/{id}` route loads the data server-side, hydrates `<ArtworkViewer>` which calls `renderStaticArtwork()` to rebuild the scene at the saved camera angle. The viewer branches per trail's `style` to construct `THREE.Line` / `Line2` / `THREE.Points` — captured ribbon and particle trails look the same as live. Old snapshots without `style` default to `'line'`.

### Key files

#### Pages & routes
- `src/app/page.tsx` — main client UI: holds `visualizerRef: VisualizerHandle | null`, wires upload / YouTube / mic / capture buttons, P key (play/pause), M key (mic toggle)
- `src/app/actions.ts` — server actions: `uploadAudio` (MP3 → base64), `downloadFromYoutube` (URL → base64), `saveArtworkAction` (ArtworkData → ID)
- `src/app/art/[id]/page.tsx` — Next 16 async-params route (`params: Promise<{ id: string }>`), calls `loadArtwork`, 404s if missing, renders `<ArtworkViewer>`
- `src/app/ui-test/page.tsx` — older standalone test page (no mic / no capture, kept for isolated visualizer debugging)

#### 3D & audio (`src/lib/`)
- `3d-visualization.ts` — `startFFT3DVisualizer(analyser, mount, audio, liveInputRef?, micAnalyserRef?)` → returns `VisualizerHandle` with `stop`, `snapshot`, `setCameraSpeed`, `setCameraSensitivity`, `setTrailLength`, `setPointShape`, `setTrailStyle`, `setTrailCurve`. Setters fan out to both main + glow layers.
- `3d-scene.ts` — `createScene(mount, init?)` → `{ scene, camera, renderer, cameraController, dispose }`. Extracted so the static viewer can reuse identical scene setup. `init?` lets the static viewer restore camera position/yaw/pitch. `CameraController` exposes `setSpeed`/`setSensitivity` via closure-captured `let` bindings. Wireframe helpers (box/grid/axes) gated by the `SHOW_WIREFRAME` constant (currently `false`).
- `static-viewer.ts` — `renderStaticArtwork(mount, data)` for the `/art/{id}` route. Branches per trail's `style`: `'line'` → `THREE.Line`, `'ribbon'` → `Line2` (with own `window.resize` listener for `LineMaterial.resolution`), `'particles'` → `THREE.Points`. Each branch returns `{ object, dispose }` for clean teardown. Old snapshots without `style` fall through the `style ?? 'line'` default.
- `trail.ts` — `createTrail(scene, { maxPoints, initialCap?, blending?, style?, curve? })` → `{ extend, setMaxPoints, setStyle, setCurve, snapshot, isFull, dispose }`. Internally splits into **control points** (the emitted path, sliding-window via `copyWithin`) and **render buffer** (densified curve samples when `curve === 'curved'`). A `MeshAdapter` indirection swaps between Line / Line2 (ribbon) / Points (particles) adapters; switching style disposes the old adapter and rebuilds from existing control data. `snapshot()` returns `{ positions, colors, style }` — JSON-safe.
- `point-cloud.ts` — `createPointCloud(scene, { maxPoints, lifetimeSec, pointSize, blending?, shape? })` → `{ emit, update, setShape, dispose }`. `setShape(shape)` disposes the old `InstancedMesh` and creates a new one with the picked geometry (closures capture the `let mesh` binding so `emit`/`update`/`dispose` automatically use the new mesh).
- `mic.ts` — `setupMic(context, mainAnalyser, gain)` → `{ gainNode, micAnalyser, stop }`. Mic source mixed into `mainAnalyser` (so main trail responds to mic too) AND tapped into a separate `micAnalyser` (lower smoothing 0.3) for the glow layer.
- `audio-features.ts` — `extractFeatures(fft)`, `createNormalizedExtractor(usePresetMusic = true)`. Two preset blocks at the top: `PRESET_NORM` (music) and `PRESET_NORM_MIC` (mic). Both currently enabled — toggle the `USE_PRESET_NORM*` constants to switch to rolling-window mode.
- `spatial-mapping.ts` — `directMapper` (active), `timeMapper` (alternate)
- `color-mapping.ts` — `bassHueMapper` (active), `rgbFromFeaturesMapper` (alternate)
- `util.ts` — `NUM_FFT_POINTS = 128`, `setupAudioAnalyser(base64)`, `setupAudioAnalyserFromUrl(url)`, `createSilentAnalyser()` (used when mic is turned on without any audio loaded)
- `artwork-data.ts` — shared `ArtworkData` + `ArtworkTrail` types (used by both client snapshot and server storage)
- `artwork-storage.ts` — `saveArtwork(id, data)` / `loadArtwork(id)`, hybrid Blob/filesystem. `'server-only'` import — must never end up in a client bundle.

#### Components (`src/components/`)
- `UploadMp3Button.tsx`, `YoutubeImportButton.tsx`, `MicButton.tsx` (with gain slider), `CaptureButton.tsx` (`forwardRef`'d so the **C** key can `.click()` it; shows share URL + copy button after success), `ArtworkViewer.tsx`
- `CameraSettings.tsx` — top-left ⚙️ panel. Three sliders (movement speed, mouse sensitivity, trail length) + three button rows (point shape 4-way, trail style 3-way, trail curve 2-way). Wired through `Props` callbacks → `visualizerRef.current?.setXxx(...)` in `page.tsx`. All controls are no-ops if the visualizer isn't running.

### Architecture decisions
- **FFT runs client-side only.** Server actions handle upload/validation/transcoding; decoding + analysis happens in the browser. Snapshots are serialized client-side and posted to a server action for storage.
- **Two analysers when mic is on, not one.** Main analyser sees the music+mic mix → drives the main trail. The mic-only analyser drives the glow layer with its own normalizer so silence stays dark.
- **Sliding window in trails, not append-forever.** Hard cap with `copyWithin` shift — keeps GPU memory bounded and the visual "moving brush" feel. Snapshot captures the current window, so the saved artwork is exactly what was on screen.
- **One `THREE.Line` per trail, not `LineSegments`.** Each vertex is shared between adjacent segments; `vertexColors: true` makes the fragment shader interpolate hue between consecutive points for free.
- **Hybrid storage avoids cloud quota during dev.** No token → writes to `./tmp/artworks/`. Token present → Vercel Blob. Same code path either way.
- **OIDC for production blob auth.** Vercel auto-injects `BLOB_STORE_ID` when a store is connected to the project; `BLOB_READ_WRITE_TOKEN` only needed for local dev.

### Controls
- **P** — play default song (first press) or toggle pause/resume
- **M** — toggle microphone on/off
- **C** — trigger the Capture button (proxies through the `captureButtonRef.current?.click()` so the share-URL UI state updates correctly)
- **Click scene** — `requestPointerLock` for mouse look
- **WASD** — move forward/left/right/back
- **Space / Shift** — move up / down
- **⚙️ panel (top-left)** — runtime tweak camera, trail length, point shape, trail style, trail curve

### Config & environment
- `next.config.ts` — `serverActions.bodySizeLimit: '50mb'` (MP3s exceed the 1 MB default), `reactCompiler: true`, `experimental.serverActions`
- Next.js **16.2.6** (Turbopack), React **19**, Tailwind 4, Three.js, `@vercel/blob`, `nanoid`
- `.env.example` (committed) lists `BLOB_READ_WRITE_TOKEN=`. `.env.local` (gitignored) holds the actual value for dev. Pull via `npx vercel env pull .env.local`.
- `.gitignore` excludes `/tmp/` (the local artwork fallback dir)

### Tunable constants (all in `src/lib/`)

#### `3d-scene.ts`
| Constant | Default | Effect |
|---|---|---|
| `SHOW_WIREFRAME` | `false` | Show/hide wireframe box + grid floor + axes helper |
| `DEFAULT_CAMERA_SPEED` | `0.9` | Starting WASD movement speed (units/frame); exposed in ⚙️ slider |
| `DEFAULT_CAMERA_SENSITIVITY` | `0.003` | Starting mouse look sensitivity (rad/px); exposed in ⚙️ slider |
| `DEFAULT_CAM_POS` | `(0, 50, 130)` | Initial camera position |

#### `3d-visualization.ts`
| Constant | Default | Effect |
|---|---|---|
| `TRAIL_BUFFER_SIZE` | `1000` | Pre-allocated max trail vertices — hard GPU ceiling, never changes at runtime |
| `DEFAULT_TRAIL_POINTS` | `50` | Starting visible window (slider default); can grow up to `TRAIL_BUFFER_SIZE` |
| Noise-floor `sum > 200` | `200` | Min FFT sum to emit a main trail point (skips near-silence) |
| Noise-floor `micSum > 400` | `400` | Min FFT sum to emit a glow trail point |
| `frameCounter % 4` | `4` | Emit every N frames — ~15 points/sec at 60 fps |

Point-cloud params (passed inline to `createPointCloud`):
- Main cloud: `maxPoints 200`, `lifetimeSec 5`, `pointSize 0.4`
- Glow cloud: `maxPoints 100`, `lifetimeSec 2`, `pointSize 3.0`, `AdditiveBlending`
- Shape defaults to `'sphere'` (SphereGeometry(1,8,8)) — swapped at runtime via `setPointShape`. Available: `sphere` / `dodecahedron` / `torus` / `torusKnot`. Mirrored to both main + glow.

#### `trail.ts`
| Constant | Default | Effect |
|---|---|---|
| `CURVE_SUBDIV` | `8` | Sub-vertices per control-point segment when `curve === 'curved'`. Higher = smoother arcs, more vertices uploaded per emit |
| `RIBBON_LINEWIDTH` | `4` | Pixel width of ribbon trail (`Line2`, `worldUnits: false`) |
| `PARTICLE_SIZE_MAIN` | `0.8` | World-unit point size for the main trail when style = `'particles'` |
| `PARTICLE_SIZE_GLOW` | `2.0` | World-unit point size for the glow trail when style = `'particles'` |

The same `RIBBON_LINEWIDTH` and `PARTICLE_SIZE_*` are duplicated in `static-viewer.ts` so captured artworks render at the same scale. Keep them in sync if tuning.

#### `audio-features.ts`
| Constant | Default | Effect |
|---|---|---|
| `USE_PRESET_NORM` | `true` | Lock music normalizer to `PRESET_NORM` ranges; `false` → rolling 150-sample window |
| `PRESET_NORM` | see file | Per-band {min,max} for music. Tweak when a new song's range looks bad |
| `USE_PRESET_NORM_MIC` | `true` | Lock mic normalizer to `PRESET_NORM_MIC`; `false` → rolling window |
| `PRESET_NORM_MIC` | see file | Per-band {min,max} for mic. Tweak when mic input range looks off |
| `NORM_WINDOW` | `150` | Rolling-window size (~10 sec at 15 Hz). Only active when preset is disabled |
| `LS_TTL_MS` | 7 days | Expiry for localStorage-persisted normalization values (`audio-norm-v1`) |

#### `spatial-mapping.ts`
| Constant | Default | Effect |
|---|---|---|
| `SCALE` | `80` | How far points spread (bass/mid/high each map to `[-40, 40]`) |
| `JITTER` | `15` | Random noise per emission — needed because real music bands are highly correlated |
| `TIME_SPEED` | `6` | (`timeMapper` only) How fast the tape extends along X (units/sec) |
| `TIME_START` | `-60` | (`timeMapper` only) Starting X position |
| `YZ_SCALE` | `80` | (`timeMapper` only) Y/Z spread for mid/high |
| `TIME_JITTER` | `4` | (`timeMapper` only) Noise per emission |

Active mapper: `directMapper`. Alternate: `timeMapper` (import and swap in `3d-visualization.ts`).

### Deployment notes
- Deployed via Vercel, auto-deploys on push to `main` (repo: `FaraDuMatin/HackTheMountain2026`)
- Blob store connected via **OIDC** — production doesn't need a static token, but local dev does
- After connecting/disconnecting the store, redeploy before revoking any tokens (production picks up the new `BLOB_STORE_ID` env var during build)
