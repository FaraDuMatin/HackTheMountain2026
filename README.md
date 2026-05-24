# LuminaWave

Turn any song or your own voice into a 3D artwork you can fly through, capture, and share.

Built at **Hack the Mountain 2026**.

---

## What it does

Drop in an MP3, paste a YouTube link, or speak into your mic. The browser runs an FFT on the audio in real time and turns each frame's bass / mid / high energy into a point in 3D space. The points stream together into a glowing line — a sound-painting that grows as the song plays. Fly through it with WASD + mouse-look, tweak the look from the ⚙️ panel (point shapes, ribbon vs. line vs. particles, smooth curves vs. straight segments), then hit **Capture** to save the artwork to a shareable URL.

## Stack

- **Next.js 16** (Turbopack) + React 19 + Tailwind 4
- **Three.js** for the 3D scene + `Line2` / `Points` / `InstancedMesh` for the visual layers
- **Web Audio API** — `AnalyserNode` FFT, all decoding/analysis client-side
- **Vercel Blob** — captured artworks stored as JSON, addressable via `nanoid(10)` IDs, served from the `/art/{id}` route
- **Vercel** for hosting (OIDC-injected blob auth in production, static token for local dev)

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Press **P** to play the default song, or upload your own.

### Optional: enable cloud capture locally

Captures default to `./tmp/artworks/{id}.json` if no blob token is present. To save to Vercel Blob from your dev machine instead:

```bash
npx vercel link              # link this folder to the Vercel project
npx vercel env pull .env.local   # pulls BLOB_READ_WRITE_TOKEN
```

## Controls

| Key | Action |
|---|---|
| **P** | Play default song / toggle pause |
| **M** | Toggle microphone |
| **C** | Capture current artwork |
| **Click scene** | Lock pointer for mouse-look |
| **WASD** | Fly forward / left / right / back |
| **Space / Shift** | Fly up / down |
| **⚙️ panel** | Tweak speed, sensitivity, trail length, point shape, trail style, trail curve |

## How the visualization works (one paragraph)

A `fftSize: 256` `AnalyserNode` gives 128 frequency bins. Those are averaged into three bands — bass (0–1 kHz), mid (1–5 kHz), high (5–22 kHz) — each normalized to `[0, 1]` against a preset range tuned for music (or a rolling-window range for the mic). Every 4 frames the latest `{bass, mid, high}` becomes a `(x, y, z)` position with a small jitter and a color derived from the bass band. That point is pushed into a sliding-window trail (up to 1000 control points) rendered as one of three styles: a 1-px `THREE.Line`, a thick `Line2` ribbon, or a `THREE.Points` cloud — optionally smoothed with a `CatmullRomCurve3` for arcs instead of straight segments. When the mic is active, a second analyser drives an additive-blended glow layer on top.

## Capturing & sharing

Hit **C** or click **Capture Artwork**. The current trail buffers and camera angle get snapshotted into a JSON document and POSTed to `saveArtworkAction`, which stores them under a 10-character `nanoid` and returns a `/art/{id}` URL. That route reconstructs the scene from the saved data — same camera angle, same trail style — without re-running any audio or FFT. Share URLs unfurl with an OpenGraph preview generated dynamically from the saved trail data (`opengraph-image.tsx` projects the trail to 2D and renders it as SVG).

## Project layout

```
src/
├── app/
│   ├── page.tsx                  # main UI: inputs, mic, capture
│   ├── art/[id]/
│   │   ├── page.tsx              # static viewer route + per-artwork OG metadata
│   │   └── opengraph-image.tsx   # dynamic OG preview from trail data
│   └── actions.ts                # server actions: upload / YouTube / save
├── components/
│   ├── CameraSettings.tsx        # ⚙️ panel
│   ├── CaptureButton.tsx         # C-key triggerable
│   └── ...                       # input buttons, artwork viewer
└── lib/
    ├── 3d-visualization.ts       # live draw loop, owns clouds + trails
    ├── 3d-scene.ts               # shared scene factory (live + static viewer)
    ├── trail.ts                  # line / ribbon / particles trail w/ optional curve smoothing
    ├── point-cloud.ts            # swappable-geometry InstancedMesh pool
    ├── static-viewer.ts          # /art/{id} renderer
    ├── audio-features.ts         # FFT → {bass, mid, high} extractor + normalizer
    ├── artwork-storage.ts        # hybrid Vercel Blob / local filesystem
    └── ...
```

More detail (architecture decisions, every tunable constant, every exported handle method) lives in [`CLAUDE.md`](./CLAUDE.md).

