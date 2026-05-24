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
   - **`pointCloud`** — InstancedMesh sphere pool, fading age-based (5 s lifetime, 200 instances)
   - **`mainTrail`** — `THREE.Line` with `vertexColors: true` and a sliding window of `MAX_TRAIL_POINTS` (currently **50** — hackathon prototype value; was 5000 originally, lowered for testing)
7. When mic is active, a **separate mic-only analyser** drives:
   - `glowCloud` — large additive-blended spheres (`THREE.AdditiveBlending`, pointSize 3.0)
   - `glowTrail` — additive line trail, same sliding-window cap
   - Both gated by a noise-floor sum check (`micSum > 400`) so silence emits nothing

### Capture & share
- `visualizerRef.current.snapshot()` returns `ArtworkData` (both trails as plain number arrays + camera position/yaw/pitch + version + timestamp)
- `saveArtworkAction(data)` → `nanoid(10)` ID → `saveArtwork(id, data)` → returns ID
- Storage is **hybrid** (`src/lib/artwork-storage.ts`, `import 'server-only'`): Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set (or OIDC-injected `BLOB_STORE_ID` in production), local `./tmp/artworks/{id}.json` otherwise
- `/art/{id}` route loads the data server-side, hydrates `<ArtworkViewer>` which calls `renderStaticArtwork()` to rebuild the scene at the saved camera angle from the saved trail buffers — no FFT, no audio, no animation loop

### Key files

#### Pages & routes
- `src/app/page.tsx` — main client UI: holds `visualizerRef: VisualizerHandle | null`, wires upload / YouTube / mic / capture buttons, P key (play/pause), M key (mic toggle)
- `src/app/actions.ts` — server actions: `uploadAudio` (MP3 → base64), `downloadFromYoutube` (URL → base64), `saveArtworkAction` (ArtworkData → ID)
- `src/app/art/[id]/page.tsx` — Next 16 async-params route (`params: Promise<{ id: string }>`), calls `loadArtwork`, 404s if missing, renders `<ArtworkViewer>`
- `src/app/ui-test/page.tsx` — older standalone test page (no mic / no capture, kept for isolated visualizer debugging)

#### 3D & audio (`src/lib/`)
- `3d-visualization.ts` — `startFFT3DVisualizer(analyser, mount, audio, liveInputRef?, micAnalyserRef?)` → returns `VisualizerHandle { stop(), snapshot() }`. Owns the draw loop, both clouds, both trails. Uses `createScene()` for renderer/camera setup.
- `3d-scene.ts` — `createScene(mount, init?)` → `{ scene, camera, renderer, cameraController, dispose }`. Extracted so the static viewer can reuse identical scene setup. `init?` lets the static viewer restore camera position/yaw/pitch.
- `static-viewer.ts` — `renderStaticArtwork(mount, data)` for the `/art/{id}` route. Builds two `THREE.Line` objects from the saved float arrays, mounts them in a `createScene()` initialized with saved camera. Returns a cleanup fn for React `useEffect`.
- `trail.ts` — `createTrail(scene, { maxPoints, blending? })` → `{ extend(pos, color), snapshot(), dispose() }`. Sliding window via `Float32Array.copyWithin(0, 3, maxPoints * 3)` when full. `snapshot()` returns plain `number[]` arrays (JSON-safe).
- `point-cloud.ts` — `createPointCloud(scene, opts)` → `{ emit, update, dispose }`. InstancedMesh pool, age-based fade. Accepts `blending` for the additive glow variant.
- `mic.ts` — `setupMic(context, mainAnalyser, gain)` → `{ gainNode, micAnalyser, stop }`. Mic source mixed into `mainAnalyser` (so main trail responds to mic too) AND tapped into a separate `micAnalyser` (lower smoothing 0.3) for the glow layer.
- `audio-features.ts` — `extractFeatures(fft)`, `createNormalizedExtractor(usePresetMusic = true)`. Two preset blocks at the top: `PRESET_NORM` (music) and `PRESET_NORM_MIC` (mic). Both currently enabled — toggle the `USE_PRESET_NORM*` constants to switch to rolling-window mode.
- `spatial-mapping.ts` — `directMapper` (active), `timeMapper` (alternate)
- `color-mapping.ts` — `bassHueMapper` (active), `rgbFromFeaturesMapper` (alternate)
- `util.ts` — `NUM_FFT_POINTS = 128`, `setupAudioAnalyser(base64)`, `setupAudioAnalyserFromUrl(url)`, `createSilentAnalyser()` (used when mic is turned on without any audio loaded)
- `artwork-data.ts` — shared `ArtworkData` + `ArtworkTrail` types (used by both client snapshot and server storage)
- `artwork-storage.ts` — `saveArtwork(id, data)` / `loadArtwork(id)`, hybrid Blob/filesystem. `'server-only'` import — must never end up in a client bundle.

#### Components (`src/components/`)
- `UploadMp3Button.tsx`, `YoutubeImportButton.tsx`, `MicButton.tsx` (with gain slider), `CaptureButton.tsx` (amber, shows share URL + copy button after success), `ArtworkViewer.tsx`

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
- **Click scene** — `requestPointerLock` for mouse look
- **WASD** — move forward/left/right/back
- **Space / Shift** — move up / down
- **Capture button** — snapshot current trails → save → reveal share URL

### Config & environment
- `next.config.ts` — `serverActions.bodySizeLimit: '50mb'` (MP3s exceed the 1 MB default), `reactCompiler: true`, `experimental.serverActions`
- Next.js **16.2.6** (Turbopack), React **19**, Tailwind 4, Three.js, `@vercel/blob`, `nanoid`
- `.env.example` (committed) lists `BLOB_READ_WRITE_TOKEN=`. `.env.local` (gitignored) holds the actual value for dev. Pull via `npx vercel env pull .env.local`.
- `.gitignore` excludes `/tmp/` (the local artwork fallback dir)

### Deployment notes
- Deployed via Vercel, auto-deploys on push to `main` (repo: `FaraDuMatin/HackTheMountain2026`)
- Blob store connected via **OIDC** — production doesn't need a static token, but local dev does
- After connecting/disconnecting the store, redeploy before revoking any tokens (production picks up the new `BLOB_STORE_ID` env var during build)
