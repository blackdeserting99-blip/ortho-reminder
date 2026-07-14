/* Render orthoprime-animated.svg to a transparent WebM with alpha using Puppeteer and FFmpeg.

Prerequisites (on your machine):
- Node.js installed
- npm install puppeteer
- ffmpeg installed and available on PATH (with libvpx and libvpx_alpha for WebM alpha, or ProRes for MOV)

Usage:
  node scripts/render-logo.js webm
  node scripts/render-logo.js mov

This script opens a headless Chromium, renders the SVG at 60 FPS for the animation duration, captures frames, and pipes them to ffmpeg to produce a WebM (with alpha) or ProRes MOV.

Note: Producing high-quality alpha WebM requires ffmpeg compiled with libvpx and proper pixel formats. Adjust the ffmpeg command if your build differs.
*/

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

(async () => {
  const outFormat = process.argv[2] || 'webm';
  const svgPath = path.join(__dirname, '..', 'public', 'orthoprime-animated.svg');
  if (!fs.existsSync(svgPath)) {
    console.error('Animated SVG not found:', svgPath);
    process.exit(1);
  }

  const width = 1280;
  const height = 288; // maintain aspect ratio (320x72 scaled)
  const fps = 60;
  const duration = 2.0; // seconds (matches animation total ~1.95s)
  const frames = Math.ceil(duration * fps);

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const html = `
    <html>
      <body style="margin:0; background:transparent;">
        ${svgContent}
        <script>
          // Nothing needed; let CSS SMIL/CSS animations drive the SVG.
        </script>
      </body>
    </html>`;

  await page.setContent(html, { waitUntil: 'networkidle0' });

  // start ffmpeg
  let ffmpegArgs;
  const outputFile = outFormat === 'mov' ? 'orthoprime-animated.mov' : 'orthoprime-animated.webm';
  if (outFormat === 'mov') {
    // ProRes 4444 with alpha
    ffmpegArgs = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-r', String(fps),
      '-i', '-',
      '-c:v', 'prores_ks',
      '-profile:v', '4',
      '-pix_fmt', 'yuva444p10le',
      outputFile,
    ];
  } else {
    // WebM with VP9 + alpha
    ffmpegArgs = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-r', String(fps),
      '-i', '-',
      '-c:v', 'libvpx-vp9',
      '-pix_fmt', 'yuva420p',
      '-auto-alt-ref', '0',
      '-b:v', '0',
      '-crf', '15',
      outputFile,
    ];
  }

  console.log('Starting ffmpeg with args:', ffmpegArgs.join(' '));
  const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let i = 0; i < frames; i++) {
    const t = (i / (fps));
    // Evaluate page at the given time by forcing animation progress via setCurrentTime (works for SMIL; CSS animations will progress normally during real-time playback)
    // We'll instead wait the correct interval and capture frame to keep timings accurate.
    const png = await page.screenshot({ omitBackground: true });
    ffmpeg.stdin.write(png);
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  ffmpeg.stdin.end();
  await new Promise((resolve) => ffmpeg.on('exit', resolve));

  await browser.close();
  console.log('Rendered', outputFile);
})();
