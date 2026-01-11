import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// PWA icon sizes needed
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const APPLE_ICON_SIZE = 180;

async function generateIcons() {
  console.log('📱 Generating PWA icons...\n');

  // Source icon path - using the iOS 1024x1024 as source
  const sourcePath = path.join(process.cwd(), 'Icon Exports', 'RISE_UP-iOS-Default-1024x1024@1x.png');

  // Check if source exists
  try {
    await fs.access(sourcePath);
  } catch {
    console.log('❌ Source icon not found at:', sourcePath);
    console.log('ℹ️  Skipping icon generation');
    return;
  }

  // Ensure output directory exists
  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  await fs.mkdir(iconsDir, { recursive: true });

  // Generate all PWA icon sizes
  for (const size of ICON_SIZES) {
    const outputPath = path.join(iconsDir, `icon-${size}.png`);
    await sharp(sourcePath)
      .resize(size, size, { fit: 'contain', background: { r: 26, g: 32, b: 44, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated icon-${size}.png`);
  }

  // Generate Apple touch icon (180x180)
  const appleTouchPath = path.join(iconsDir, 'apple-touch-icon.png');
  await sharp(sourcePath)
    .resize(APPLE_ICON_SIZE, APPLE_ICON_SIZE, { fit: 'contain', background: { r: 26, g: 32, b: 44, alpha: 1 } })
    .png()
    .toFile(appleTouchPath);
  console.log(`✅ Generated apple-touch-icon.png (${APPLE_ICON_SIZE}x${APPLE_ICON_SIZE})`);

  console.log('\n🎉 All icons generated successfully!');
  console.log(`📁 Icons saved to: ${iconsDir}`);
}

generateIcons().catch(console.error);

export {};
