# App icons

Source of truth: **`icon.svg`** (the CORRECTIV mark, vector).

`ns resources generate icons` needs a raster source, so **`icon.png`** is a padded
1024×1024 render of `icon.svg` (logo at ~68 % so it stays inside the adaptive-icon
safe zone and isn't clipped by the launcher mask).

To regenerate every icon (Android legacy + adaptive, iOS) after changing the logo:

```bash
# 1. re-render the padded raster from the SVG (ImageMagick)
magick -background none -density 1536 App_Resources/icon.svg -resize 700x700 \
  -gravity center -background none -extent 1024x1024 App_Resources/icon.png

# 2. generate the icon set on the brand-red background
ns resources generate icons App_Resources/icon.png --background '#FF5064'
```
