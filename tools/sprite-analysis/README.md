# Sprite Analysis Tool

A utility for analyzing pixel art images and generating data for Phaser game sprites.

## Features

- Resize images while preserving pixel art (nearest neighbor)
- Extract pixel positions and colors
- Export to CSV (all pixels and grouped by color)
- Perfect for recreating logos and sprites in code

## Usage

### Analyze an image as-is:
```bash
python analyze-sprite.py input/your-image.png
```

### Resize and analyze:
```bash
python analyze-sprite.py input/your-image.png --size 20 20
```

## Directory Structure

- `input/` - Place your source images here
- `output/` - Generated CSV files and resized images go here
- Both directories are gitignored

## Output Files

- `*_pixels.csv` - All pixels with x, y, hex_color, r, g, b
- `*_by_color.csv` - Pixels grouped by color (easier for coding)

## Example Workflow

1. Place logo/sprite in `input/` folder
2. Run: `python analyze-sprite.py input/logo.png --size 20 20`
3. Check `output/*_by_color.csv` for pixel data
4. Use the data to recreate the sprite pixel-by-pixel in your scene

## Notes

- Images are gitignored to keep repo clean
- Use NEAREST resampling to preserve pixel art style
- Smaller sizes work better for in-game logos (16×16 to 24×24)

