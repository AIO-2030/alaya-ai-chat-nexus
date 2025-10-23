#!/bin/bash

# PWA Icon Generator Script
# This script creates placeholder icons for development

echo "🎨 Generating PWA placeholder icons..."

# Create icons directory if it doesn't exist
mkdir -p public/icons

# Icon sizes needed for PWA
sizes=(16 32 72 96 128 144 152 192 384 512)

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "✅ ImageMagick found, generating PNG icons..."
    
    for size in "${sizes[@]}"; do
        echo "Creating icon-${size}x${size}.png..."
        convert -size ${size}x${size} \
            -background "#8b5cf6" \
            -fill white \
            -pointsize $((size/4)) \
            -gravity center \
            -annotate +0+0 "U" \
            "public/icons/icon-${size}x${size}.png"
    done
    
    echo "✅ All PNG icons generated successfully!"
    
elif command -v node &> /dev/null; then
    echo "⚠️  ImageMagick not found, creating simple placeholder files..."
    
    for size in "${sizes[@]}"; do
        echo "Creating placeholder for icon-${size}x${size}.png..."
        # Create a simple text file as placeholder
        echo "Placeholder icon ${size}x${size} - Replace with actual PNG file" > "public/icons/icon-${size}x${size}.png"
    done
    
    echo "⚠️  Placeholder files created. Please replace with actual PNG icons."
    echo "📖 See PWA_ICON_GENERATION.md for instructions on generating real icons."
    
else
    echo "❌ Neither ImageMagick nor Node.js found."
    echo "📖 Please install ImageMagick or Node.js to generate icons."
    echo "📖 Or manually create PNG icons following PWA_ICON_GENERATION.md"
fi

echo ""
echo "📋 Next steps:"
echo "1. Replace placeholder icons with actual PNG files"
echo "2. Test PWA installation in browser"
echo "3. Verify offline functionality"
echo "4. Test on mobile devices"
echo ""
echo "🔗 Useful resources:"
echo "- PWA Builder: https://www.pwabuilder.com/"
echo "- Lighthouse PWA Audit: Chrome DevTools > Lighthouse"
echo "- Favicon Generator: https://favicon.io/"
