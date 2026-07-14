Trace WebM to SVG (stroke-accurate)

This script extracts a frame from a WebM and vectorizes it with potrace.

Prerequisites
- `ffmpeg` available on PATH
- Node.js installed
- From the project root, install the node deps used by the script:

npm install potrace sharp

Run

node scripts/trace-webm.js path/to/removed_bg_alpha.webm 0.9

- The second argument is the time (seconds) within the WebM to capture; adjust if needed.
- The script writes `public/orthoprime-traced.svg`.

Notes
- Tracing a raster will be an approximation; to guarantee pixel-perfect match you must provide the original vector (SVG/AI/PDF) or an SVG with outlines. If the traced result looks good, I will use its exact stroke paths to build the reveal animation.
