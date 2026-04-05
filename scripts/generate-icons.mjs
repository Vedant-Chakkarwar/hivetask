// Script to generate PWA icons using SVG + sharp (or pure SVG as PNG fallback)
// Run: node scripts/generate-icons.mjs

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

mkdirSync(iconsDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function drawHiveTaskIcon(canvas) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const pad = size * 0.08;
  const r = (size - pad * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Background: amber gradient
  const bg = ctx.createRadialGradient(cx, cy * 0.8, r * 0.1, cx, cy, r * 1.2);
  bg.addColorStop(0, '#FCD34D');
  bg.addColorStop(1, '#D97706');

  // Rounded rect background
  ctx.beginPath();
  const bRadius = size * 0.22;
  ctx.moveTo(pad + bRadius, pad);
  ctx.lineTo(size - pad - bRadius, pad);
  ctx.quadraticCurveTo(size - pad, pad, size - pad, pad + bRadius);
  ctx.lineTo(size - pad, size - pad - bRadius);
  ctx.quadraticCurveTo(size - pad, size - pad, size - pad - bRadius, size - pad);
  ctx.lineTo(pad + bRadius, size - pad);
  ctx.quadraticCurveTo(pad, size - pad, pad, size - pad - bRadius);
  ctx.lineTo(pad, pad + bRadius);
  ctx.quadraticCurveTo(pad, pad, pad + bRadius, pad);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();

  // Draw bee/hive hexagon in white
  const hexR = size * 0.28;
  const hexCx = cx;
  const hexCy = cy;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = hexCx + hexR * Math.cos(angle);
    const y = hexCy + hexR * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = size * 0.025;
  ctx.stroke();

  // Letter H in the center
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.38}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', cx, cy + size * 0.02);
}

for (const size of sizes) {
  try {
    const canvas = createCanvas(size, size);
    drawHiveTaskIcon(canvas);
    const buf = canvas.toBuffer('image/png');
    writeFileSync(join(iconsDir, `icon-${size}.png`), buf);
    console.log(`Generated icon-${size}.png`);
  } catch (err) {
    console.error(`Failed to generate icon-${size}.png:`, err.message);
  }
}

console.log('Icon generation complete!');
