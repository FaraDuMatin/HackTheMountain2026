# HackTheMountain . Sound to 3D visualization

Upload an MP3 (or press **P** to use the default song), and watch a 3D point cloud react to its bass/mid/high frequency bands in real time.

- **P** — play default song / pause / resume
- **Upload MP3** — replace current song
- **Click scene** — lock pointer for mouse-look
- **WASD** — move camera | **Space / Shift** — up / down | **Mouse** — look around

## Architecture

Each frame, FFT data is reduced to three values (`bass`, `mid`, `high`) which become a point's XYZ position and color. Points fade out over ~5 seconds.

See [`src/lib/README.md`](src/lib/README.md) for the full module breakdown — the audio pipeline, the spatial mapper, the color mapper, and the Three.js point cloud system.

## Things to do
- Changer material
- Ui explication, touches, vitesse. got to http://localhost:3000/ui-test to test overaly UI.
- Customizable 3d model.
