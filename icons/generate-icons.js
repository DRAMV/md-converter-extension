// Run with: node icons/generate-icons.js
// Requires: npm install canvas

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const sizes = [16, 48, 128];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#5B4AF7";
  const r = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Arrow symbol
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(size * 0.55)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⬇", size / 2, size / 2 + size * 0.03);

  const buffer = canvas.toBuffer("image/png");
  const outPath = path.join(__dirname, `icon${size}.png`);
  fs.writeFileSync(outPath, buffer);
  console.log(`Written: icon${size}.png`);
}
