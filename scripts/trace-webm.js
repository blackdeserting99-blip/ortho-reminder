#!/usr/bin/env node
// Extract a frame from a WebM and vectorize it to SVG using potrace
// Usage: node scripts/trace-webm.js <input.webm> [time_seconds]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  const [,, inputPath, timeArg] = process.argv;
  if (!inputPath) {
    console.error('Usage: node scripts/trace-webm.js <input.webm> [time_seconds]');
    process.exit(2);
  }

  const absIn = path.resolve(inputPath);
  if (!fs.existsSync(absIn)) {
    console.error('File not found:', absIn);
    process.exit(2);
  }

  const tmpPng = path.resolve('scripts', 'trace-frame.png');
  const outSvg = path.resolve('public', 'orthoprime-traced.svg');

  const time = timeArg || '0.9'; // default time to capture (seconds)

  console.log('Extracting frame at', time, 's to', tmpPng);
  try {
    // ffmpeg: seek to time, output single frame scaled up for cleaner tracing
    execSync(`ffmpeg -y -ss ${time} -i "${absIn}" -frames:v 1 -vf "scale=1600:-1" "${tmpPng}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error('ffmpeg failed. Ensure ffmpeg is installed and on PATH.');
    process.exit(3);
  }

  // require potrace and sharp if available
  let potrace;
  try {
    potrace = require('potrace');
  } catch (e) {
    console.error('Please run: npm install potrace sharp');
    process.exit(4);
  }

  const sharp = require('sharp');

  console.log('Preparing image and tracing...');
  // Convert PNG to 1-bit PBM via thresholding to get crisp outlines
  const buffer = await sharp(tmpPng)
    .grayscale()
    .normalise()
    .threshold(180)
    .toBuffer();

  potrace.trace(buffer, { color: 'black', background: 'transparent', turdSize: 100 }, (err, svg) => {
    if (err) {
      console.error('Potrace failed:', err);
      process.exit(5);
    }
    fs.writeFileSync(outSvg, svg, 'utf8');
    console.log('Wrote traced SVG to', outSvg);
    console.log('You can now review and refine the SVG in a vector editor.');
  });
}

main().catch(err => { console.error(err); process.exit(99); });
