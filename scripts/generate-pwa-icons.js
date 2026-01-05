const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const inputPath = path.join(__dirname, '../public/logo.png');
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Gerando icones PWA...');

  try {
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`Imagem original: ${metadata.width}x${metadata.height}`);

    // Generate regular icons
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 79, g: 70, b: 229, alpha: 1 } // Indigo background
        })
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);

      console.log(`Gerado: icon-${size}x${size}.png`);
    }

    // Generate maskable icons (with padding for safe area)
    const maskableSizes = [192, 512];
    for (const size of maskableSizes) {
      const outputPath = path.join(outputDir, `icon-maskable-${size}x${size}.png`);
      const innerSize = Math.floor(size * 0.8); // 80% for safe area
      const padding = Math.floor((size - innerSize) / 2);

      // Create a background and composite the logo
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 79, g: 70, b: 229, alpha: 1 } // Indigo background
        }
      })
        .composite([
          {
            input: await sharp(inputPath)
              .resize(innerSize, innerSize, { fit: 'contain', background: { r: 79, g: 70, b: 229, alpha: 1 } })
              .toBuffer(),
            top: padding,
            left: padding
          }
        ])
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);

      console.log(`Gerado: icon-maskable-${size}x${size}.png`);
    }

    // Generate favicon
    const faviconPath = path.join(__dirname, '../public/favicon.ico');
    await sharp(inputPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 79, g: 70, b: 229, alpha: 1 }
      })
      .toFile(faviconPath.replace('.ico', '.png'));

    // Copy as favicon.ico (browsers accept PNG)
    fs.copyFileSync(faviconPath.replace('.ico', '.png'), faviconPath);
    fs.unlinkSync(faviconPath.replace('.ico', '.png'));
    console.log('Gerado: favicon.ico');

    // Generate apple-touch-icon
    const appleTouchPath = path.join(outputDir, 'apple-touch-icon.png');
    await sharp(inputPath)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 79, g: 70, b: 229, alpha: 1 }
      })
      .png({ quality: 90 })
      .toFile(appleTouchPath);
    console.log('Gerado: apple-touch-icon.png');

    console.log('\nTodos os icones foram gerados com sucesso!');

  } catch (error) {
    console.error('Erro ao gerar icones:', error);
    process.exit(1);
  }
}

generateIcons();
