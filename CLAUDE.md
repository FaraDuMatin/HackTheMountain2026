@AGENTS.md

## Project: Hack the Mountain 2026 — Audio FFT 3D Visualizer

### What this app does
Turns sound into 3D artwork. Three input sources (MP3 upload, YouTube URL, live mic) feed a Web Audio FFT pipeline; each audio frame's bass/mid/high energy bands become a vertex in a persistent 3D line trail rendered with Three.js. The user can fly through the trail (WASD + mouse-look), then **capture** the artwork — the trail data is saved to Vercel Blob and reachable via a shareable `/art/{id}` URL.

### Inputs
- **MP3 upload** — server action validates + returns base64, browser decodes via Web Audio
- **YouTube URL** — `downloadFromYoutube` server action (external backend), same base64 flow
- **Live microphone** — `getUserMedia` + mic-only `AnalyserNode` for the glow layer
- **Numbered songs** — `public/default0.mp3` through `public/default9.mp3`. Pressing keys **1–9** and **0** on the keyboard loads the corresponding song instantly (tears down current session, starts new one). **P** is now pure pause/resume only (no-op if nothing loaded). M = mic toggle, C = capture.

### Audio → visuals pipeline
1. Source feeds an `AnalyserNode` (`fftSize 256` → 128 bins, ~344 Hz each)
2. `extractFeatures(fft)` averages bins into `{ bass, mid, high }` ∈ [0,1]
3. `createNormalizedExtractor()` remaps each band via either a **preset** (`PRESET_NORM` for music, `PRESET_NORM_MIC` for mic — both currently enabled) or a rolling 150-sample window. Preset values are persisted in `localStorage` (`audio-norm-v1`, 7-day TTL) so calibration is warm across sessions.
4. `directMapper(features, t)` → `THREE.Vector3` (X = bass, Y = mid, Z = high, centered, with jitter) inside the `[-40, 40]³` cube
5. `bassHueMapper(features)` → `THREE.Color` (active color mapper; `rgbFromFeaturesMapper` is the alternate)
6. Two parallel rendering layers:
   - **`pointCloud`** — InstancedMesh pool, age-based fade (5 s lifetime, 200 instances, pointSize **3.0**). Geometry is runtime-swappable via `setShape`: `sphere | dodecahedron | torus | torusKnot`.
   - **`mainTrail`** — sliding window of control points (pre-allocated `TRAIL_BUFFER_SIZE=1000`, starting visible cap `DEFAULT_TRAIL_POINTS=50`). The control points feed a `MeshAdapter` selected by `setStyle`: `line` (`THREE.Line`, 1px), `ribbon` (`Line2` from three/examples, **4px** screen-space, vertex colors), or `particles` (`THREE.Points`, world-space dots, size **2.0**). Independently, `setCurve('curved')` densifies the path through a `CatmullRomCurve3` at 8× sub-vertices per control segment, with linear color interpolation between control colors.
7. When mic is active, a **separate mic-only analyser** drives:
   - `glowCloud` — additive-blended layer, same shape options as `pointCloud`, pointSize **6.0**, lifetime 2 s, 100 instances
   - `glowTrail` — additive variant of the trail, same style/curve as `mainTrail`. Ribbon width **8px**, particle size **4.0**.
   - Both gated by a noise-floor sum check (`micSum > 400`) so silence emits nothing
8. All visual parameters above are exposed in the ⚙️ **CameraSettings** panel (top-left): camera speed/sensitivity sliders, trail length slider, point-shape picker, trail-style picker, trail-curve picker, **wireframe On/Off toggle**.

### Capture & share
- `visualizerRef.current.snapshot()` returns `ArtworkData` (both trails as plain number arrays + per-trail `style` + camera position/yaw/pitch + version + timestamp). Curve mode is **baked into** the positions (densified samples), so it doesn't need to be stored separately. Point-shape is **not** stored — the static viewer doesn't render point clouds.
- `saveArtworkAction(data)` → `nanoid(10)` ID → `saveArtwork(id, data)` → returns ID
- Storage is **hybrid** (`src/lib/artwork-storage.ts`, `import 'server-only'`): Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set (or OIDC-injected `BLOB_STORE_ID` in production), local `./tmp/artworks/{id}.json` otherwise
- `/art/{id}` route loads the data server-side, hydrates `<ArtworkViewer>` which calls `renderStaticArtwork()` to rebuild the scene at the saved camera angle. The viewer branches per trail's `style` to construct `THREE.Line` / `Line2` / `THREE.Points` — captured ribbon and particle trails look the same as live. Old snapshots without `style` default to `'line'`.

### Key files

#### Pages & routes
- `src/app/page.tsx` — main client UI: holds `visualizerRef: VisualizerHandle | null`, wires upload / YouTube / mic / capture buttons, number keys 0-9 (load song), P (pause/resume), M (mic toggle), C (capture)
- `src/app/actions.ts` — server actions: `uploadAudio` (MP3 → base64), `downloadFromYoutube` (URL → base64), `saveArtworkAction` (ArtworkData → ID)
- `src/app/art/[id]/page.tsx` — Next 16 async-params route (`params: Promise<{ id: string }>`), calls `loadArtwork`, 404s if missing, renders `<ArtworkViewer>`
- `src/app/art/[id]/opengraph-image.tsx` — dynamic OG image (1200×630 PNG) rendered with Satori/ImageResponse; projects trail positions to 2D SVG polylines; used as gallery card thumbnails too
- `src/app/ui-test/page.tsx` — older standalone test page (no mic / no capture, kept for isolated visualizer debugging)

#### 3D & audio (`src/lib/`)
- `3d-visualization.ts` — `startFFT3DVisualizer(analyser, mount, audio, liveInputRef?, micAnalyserRef?)` → returns `VisualizerHandle` with `stop`, `snapshot`, `setCameraSpeed`, `setCameraSensitivity`, `setTrailLength`, `setPointShape`, `setTrailStyle`, `setTrailCurve`, **`setWireframe(v: boolean)`**. Setters fan out to both main + glow layers.
- `3d-scene.ts` — `createScene(mount, init?)` → `{ scene, camera, renderer, cameraController, setWireframe, dispose }`. Wireframe objects (box edges + grid + axes) are **always created** but `visible = false` by default; `setWireframe(v)` toggles their `.visible`. `SceneSetup` type includes `setWireframe`. `CameraController` exposes `setSpeed`/`setSensitivity`.
- `static-viewer.ts` — `renderStaticArtwork(mount, data)` for the `/art/{id}` route. Branches per trail's `style`: `'line'` → `THREE.Line`, `'ribbon'` → `Line2`, `'particles'` → `THREE.Points`. Uses `RIBBON_LINEWIDTH_MAIN=4` / `RIBBON_LINEWIDTH_GLOW=8` and `PARTICLE_SIZE_MAIN=2.0` / `PARTICLE_SIZE_GLOW=4.0`.
- `trail.ts` — `createTrail(scene, { maxPoints, initialCap?, blending?, style?, curve? })` → `{ extend, setMaxPoints, setStyle, setCurve, snapshot, isFull, dispose }`. Constants: `RIBBON_LINEWIDTH_MAIN=4`, `RIBBON_LINEWIDTH_GLOW=8`, `PARTICLE_SIZE_MAIN=2.0`, `PARTICLE_SIZE_GLOW=4.0`, `CURVE_SUBDIV=8`. Uses `opts.blending` to pick the glow vs main size/width. `MeshAdapter` indirection swaps between Line/Line2/Points without touching control-point data.
- `point-cloud.ts` — `createPointCloud(scene, { maxPoints, lifetimeSec, pointSize, blending?, shape? })` → `{ emit, update, setShape, dispose }`. `setShape` replaces the `InstancedMesh`; closures auto-see the new mesh.
- `mic.ts` — `setupMic(context, mainAnalyser, gain)` → `{ gainNode, micAnalyser, stop }`.
- `audio-features.ts` — `extractFeatures(fft)`, `createNormalizedExtractor(usePresetMusic = true)`.
- `spatial-mapping.ts` — `directMapper` (active), `timeMapper` (alternate)
- `color-mapping.ts` — `bassHueMapper` (active), `rgbFromFeaturesMapper` (alternate)
- `util.ts` — `NUM_FFT_POINTS = 128`, `setupAudioAnalyser(base64)`, `setupAudioAnalyserFromUrl(url)`, `createSilentAnalyser()`
- `artwork-data.ts` — shared `ArtworkData` + `ArtworkTrail` types. `ArtworkTrail.style?: TrailStyle` (optional for backward compat with old snapshots).
- `artwork-storage.ts` — `saveArtwork(id, data)` / `loadArtwork(id)`, hybrid Blob/filesystem. `'server-only'`.

#### Components (`src/components/`)
- `UploadMp3Button.tsx`, `YoutubeImportButton.tsx`, `MicButton.tsx` (with gain slider), `CaptureButton.tsx` (`forwardRef`'d so the **C** key can `.click()` it; shows share URL + copy button after success), `ArtworkViewer.tsx`
- `CameraSettings.tsx` — top-left ⚙️ panel. Three sliders (movement speed, mouse sensitivity, trail length) + four button rows (point shape 4-way, trail style 3-way, trail curve 2-way, **wireframe 2-way On/Off**). Props: `onSpeedChange`, `onSensitivityChange`, `onTrailLengthChange`, `onShapeChange`, `onTrailStyleChange`, `onTrailCurveChange`, **`onWireframeChange`**.

### Architecture decisions
- **FFT runs client-side only.** Server actions handle upload/validation/transcoding; decoding + analysis happens in the browser.
- **Two analysers when mic is on, not one.** Main analyser sees the music+mic mix → drives the main trail. The mic-only analyser drives the glow layer with its own normalizer.
- **Sliding window in trails, not append-forever.** Hard cap with `copyWithin` shift. Snapshot captures the current window.
- **One `THREE.Line` per trail, not `LineSegments`.** `vertexColors: true` gives free gradient interpolation.
- **Hybrid storage avoids cloud quota during dev.** No token → writes to `./tmp/`. Token present → Vercel Blob.
- **OIDC for production blob auth.** Vercel auto-injects `BLOB_STORE_ID`; `BLOB_READ_WRITE_TOKEN` only needed locally.
- **Wireframe is runtime-toggled, not compile-time.** Objects always exist in the scene, `visible` property toggled via `setWireframe()` on `SceneSetup` → `VisualizerHandle`.

### Controls
- **1–9, 0** — load `public/default{n}.mp3` (tears down current session, starts new)
- **P** — toggle pause/resume on currently loaded audio (no-op if nothing loaded)
- **M** — toggle microphone on/off
- **C** — trigger the Capture button
- **Click scene** — `requestPointerLock` for mouse look
- **WASD** — fly forward/left/right/back
- **Space / Shift** — fly up/down
- **⚙️ panel (top-left)** — runtime tweak camera, trail length, point shape, trail style, trail curve, wireframe

### Config & environment
- `next.config.ts` — `serverActions.bodySizeLimit: '50mb'`, `reactCompiler: true`
- Next.js **16.2.6** (Turbopack), React **19**, Tailwind 4, Three.js 0.184, `@vercel/blob`, `nanoid`
- `.env.example` lists `BLOB_READ_WRITE_TOKEN=`. `.env.local` (gitignored) holds the actual value. Pull via `npx vercel env pull .env.local`.
- `.gitignore` excludes `/tmp/`

### Tunable constants (all in `src/lib/`)

#### `3d-scene.ts`
| Constant | Default | Effect |
|---|---|---|
| `DEFAULT_CAMERA_SPEED` | `0.9` | Starting WASD movement speed (units/frame); exposed in ⚙️ slider |
| `DEFAULT_CAMERA_SENSITIVITY` | `0.003` | Starting mouse look sensitivity (rad/px); exposed in ⚙️ slider |
| `DEFAULT_CAM_POS` | `(0, 50, 130)` | Initial camera position |

Note: `SHOW_WIREFRAME` compile-time constant is **gone** — wireframe is now a runtime toggle via `setWireframe(v)` on `SceneSetup`.

#### `3d-visualization.ts`
| Constant | Default | Effect |
|---|---|---|
| `TRAIL_BUFFER_SIZE` | `1000` | Pre-allocated max trail vertices — hard GPU ceiling |
| `DEFAULT_TRAIL_POINTS` | `50` | Starting visible window (slider default) |
| Noise-floor `sum > 200` | `200` | Min FFT sum to emit a main trail point |
| Noise-floor `micSum > 400` | `400` | Min FFT sum to emit a glow trail point |
| `frameCounter % 4` | `4` | Emit every N frames — ~15 points/sec at 60 fps |

Point-cloud params (passed inline to `createPointCloud`):
- Main cloud: `maxPoints 200`, `lifetimeSec 5`, **`pointSize 3.0`**
- Glow cloud: `maxPoints 100`, `lifetimeSec 2`, **`pointSize 6.0`**, `AdditiveBlending`

#### `trail.ts`
| Constant | Default | Effect |
|---|---|---|
| `CURVE_SUBDIV` | `8` | Sub-vertices per control-point segment when `curve === 'curved'` |
| `RIBBON_LINEWIDTH_MAIN` | `4` | Pixel width of main ribbon trail (`Line2`, `worldUnits: false`) |
| `RIBBON_LINEWIDTH_GLOW` | `8` | Pixel width of glow ribbon trail |
| `PARTICLE_SIZE_MAIN` | `2.0` | World-unit point size for main trail particles |
| `PARTICLE_SIZE_GLOW` | `4.0` | World-unit point size for glow trail particles |

The same constants (`RIBBON_LINEWIDTH_MAIN/GLOW`, `PARTICLE_SIZE_*`) are duplicated in `static-viewer.ts`. Keep in sync when tuning.

#### `audio-features.ts`
| Constant | Default | Effect |
|---|---|---|
| `USE_PRESET_NORM` | `true` | Lock music normalizer to `PRESET_NORM` ranges |
| `USE_PRESET_NORM_MIC` | `true` | Lock mic normalizer to `PRESET_NORM_MIC` |
| `NORM_WINDOW` | `150` | Rolling-window size (~10 sec at 15 Hz). Only active when preset is disabled |
| `LS_TTL_MS` | 7 days | Expiry for localStorage-persisted normalization values |

#### `spatial-mapping.ts`
| Constant | Default | Effect |
|---|---|---|
| `SCALE` | `80` | How far points spread (bass/mid/high each map to `[-40, 40]`) |
| `JITTER` | `15` | Random noise per emission |

Active mapper: `directMapper`. Alternate: `timeMapper`.

### Deployment notes
- Deployed via Vercel, auto-deploys on push to `main` (repo: `FaraDuMatin/HackTheMountain2026`)
- Blob store connected via **OIDC** — production doesn't need a static token
- After connecting/disconnecting the store, redeploy before revoking tokens

### Planned next feature: Gallery
See `../ADD-GALLERY.md` for the full implementation plan. Summary:
- Two new routes: `/gallery` (public grid of saved artworks) and `/add-gallery` (form to add an entry)
- Gallery entries stored in same Vercel Blob store under `gallery/` prefix (alongside `artworks/`)
- New files: `src/lib/gallery-data.ts`, `src/lib/gallery-storage.ts`
- New server action: `saveGalleryEntryAction` in `src/app/actions.ts`
- CaptureButton gets "Add to gallery" + "Go to gallery" buttons post-capture
- OG image at `/art/{id}/opengraph-image` doubles as gallery card thumbnail (no extra work)
- Implementation order: gallery-data → gallery-storage → server action → /add-gallery page → /gallery page → CaptureButton
