# Extension Icons

This directory contains the extension icons at various sizes.

## Required Sizes

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Generating Icons

Use the `icon.svg` file in the parent directory to generate PNG icons:

1. Open `icon.svg` in an image editor (GIMP, Photoshop, Figma, etc.)
2. Export as PNG at the required sizes
3. Save to this directory

Or use online tools:
- https://cloudconvert.com/svg-to-png
- https://svgtopng.com/

## Placeholder Icons

For development, you can use the SVG directly or create simple colored squares.
The manifest files reference these icon paths.
