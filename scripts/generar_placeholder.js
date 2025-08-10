// Script para generar placeholder.png con fondo de mapa y texto "Sin imagen"
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const width = 400;
const height = 300;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fondo blanco
ctx.fillStyle = '#fff';
ctx.fillRect(0, 0, width, height);

// Dibujar líneas tipo "mapa" en gris
ctx.strokeStyle = '#bbb';
ctx.lineWidth = 2;
for (let i = 0; i < 10; i++) {
  ctx.beginPath();
  ctx.moveTo(Math.random() * width, 0);
  ctx.lineTo(Math.random() * width, height);
  ctx.stroke();
}
for (let i = 0; i < 10; i++) {
  ctx.beginPath();
  ctx.moveTo(0, Math.random() * height);
  ctx.lineTo(width, Math.random() * height);
  ctx.stroke();
}

// Texto centrado
ctx.font = 'bold 32px Arial';
ctx.fillStyle = '#222';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Sin imagen', width / 2, height / 2);

// Guardar imagen
const outPath = path.join(__dirname, '..', 'web', 'public', 'assets', 'images', 'placeholder.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buffer);
console.log('Imagen generada en', outPath);
