#!/usr/bin/env node
const sharp = require('sharp');
const GIFEncoder = require('gifencoder');
const fs = require('fs');
const path = require('path');

async function createRarityGif(imagePath, rarity, outputPath) {
  try {
    // Load and validate input image
    const imageBuffer = await fs.promises.readFile(imagePath);
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();

    // Set up GIF encoder
    const encoder = new GIFEncoder(width, height);
    encoder.createReadStream().pipe(fs.createWriteStream(outputPath));
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(100);
    encoder.setQuality(10);

    // Generate frames
    for (let frame = 0; frame < 20; frame++) {
      const overlay = generateFrameOverlay(width, height, rarity, frame);
      const frameBuffer = await image
        .clone()
        .composite([{
          input: Buffer.from(overlay),
          blend: 'over'
        }])
        .toBuffer();

      encoder.addFrame(frameBuffer);
    }

    encoder.finish();
    console.log(`Successfully created ${outputPath}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function generateFrameOverlay(width, height, rarity, frame) {
  const normalizedFrame = frame / 20;
  
  switch(rarity) {
    case 'scanlines': {
      const lineGap = 4;
      const lines = [];
      for (let y = 0; y < height; y += lineGap) {
        lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#00ff00" stroke-width="2" opacity="0.3"/>`);
      }
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)"/>
        ${lines.join('')}
      </svg>`;
    }

    case 'glow-pulse':
      const opacity = 0.4 + 0.5 * Math.sin(frame * 0.5);
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="none"
              stroke="hsl(${frame * 18},100%,50%)" stroke-width="15"
              filter="url(#glow)" opacity="${opacity}"/>
      </svg>`;

    case 'rgb-shift':
      const offset = Math.sin(normalizedFrame * Math.PI) * 5;
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <filter id="displace">
          <feOffset in="SourceGraphic" dx="${-offset}" dy="${offset}" result="red"/>
          <feOffset in="SourceGraphic" dx="${offset}" dy="${-offset}" result="blue"/>
          <feBlend in="red" in2="blue" mode="screen"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#displace)" opacity="0.7"/>
      </svg>`;

    default:
      throw new Error(`Supported rarities: scanlines, glow-pulse, rgb-shift`);
  }
}

// Handle command-line arguments
if (process.argv.length < 3) {
  console.log(`
Usage: bun phosphorizer.js <input-image> [effect-type] [output-file]

Available effects:
- scanlines (default)
- glow-pulse
- rgb-shift

Example:
  bun phosphorizer.js myimage.png glow-pulse output.gif
`);
  process.exit(0);
}

const inputImage = process.argv[2];
const effectType = process.argv[3] || 'scanlines';
let outputFile = process.argv[4] || 
  `${path.parse(inputImage).name}_${effectType}.gif`;

// Ensure output has .gif extension
if (!outputFile.endsWith('.gif')) {
  outputFile += '.gif';
}

createRarityGif(inputImage, effectType, outputFile);
