# PWA Icon Generation Guide

## Required Icon Sizes

The following icon sizes are needed for the PWA manifest:

- 72x72px
- 96x96px  
- 128x128px
- 144x144px
- 152x152px
- 192x192px
- 384x384px
- 512x512px

## How to Generate Icons

### Option 1: Using Online Tools
1. Use the provided `icon.svg` file as the source
2. Visit an online icon generator like:
   - https://realfavicongenerator.net/
   - https://www.favicon-generator.org/
   - https://favicon.io/favicon-generator/
3. Upload the SVG file and generate all required sizes
4. Download and place them in the `/public/icons/` directory

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick if not already installed
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Generate all required sizes
sizes=(72 96 128 144 152 192 384 512)
for size in "${sizes[@]}"; do
  convert public/icons/icon.svg -resize ${size}x${size} public/icons/icon-${size}x${size}.png
done
```

### Option 3: Using Node.js Script
```javascript
const sharp = require('sharp');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  for (const size of sizes) {
    await sharp('public/icons/icon.svg')
      .resize(size, size)
      .png()
      .toFile(`public/icons/icon-${size}x${size}.png`);
    console.log(`Generated icon-${size}x${size}.png`);
  }
}

generateIcons().catch(console.error);
```

## Icon Requirements

- **Format**: PNG
- **Background**: Should be opaque (not transparent) for better visibility
- **Design**: Should be recognizable at small sizes
- **Purpose**: 
  - `maskable` - Icons that can be adapted to different shapes
  - `any` - Standard icons

## Placeholder Icons

For development purposes, you can create simple colored squares as placeholders:

```bash
# Create placeholder icons (requires ImageMagick)
sizes=(72 96 128 144 152 192 384 512)
for size in "${sizes[@]}"; do
  convert -size ${size}x${size} xc:"#8b5cf6" -fill white -pointsize $((size/4)) -gravity center -annotate +0+0 "U" public/icons/icon-${size}x${size}.png
done
```

## Screenshots

Create screenshots for the PWA manifest:

1. **Desktop Screenshot**: 1280x720px
   - Take a screenshot of the main interface on desktop
   - Save as `/public/screenshots/desktop-screenshot.png`

2. **Mobile Screenshot**: 390x844px (iPhone 12 Pro size)
   - Take a screenshot of the main interface on mobile
   - Save as `/public/screenshots/mobile-screenshot.png`

## Verification

After generating all icons, verify they exist:
```bash
ls -la public/icons/
ls -la public/screenshots/
```

All files should be present and properly sized.
