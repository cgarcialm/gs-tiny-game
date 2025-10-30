#!/usr/bin/env python3
"""
Sprite Analysis Tool for gs-tiny-game

Analyzes pixel art images and outputs pixel data for use in Phaser game code.
Can resize images and export pixel positions grouped by color.

Usage:
    python analyze-sprite.py <image_path> [--size WIDTH HEIGHT]

Examples:
    python analyze-sprite.py input/logo.png --size 20 20
    python analyze-sprite.py input/sprite.png
"""

from PIL import Image
import sys
import csv
import argparse
import os

def rgb_to_hex(r, g, b):
    """Convert RGB to hex color code"""
    return f"0x{r:02x}{g:02x}{b:02x}"

def resize_image(image_path, width, height):
    """Resize image using nearest neighbor (for pixel art)"""
    img = Image.open(image_path)
    resized = img.resize((width, height), Image.Resampling.NEAREST)
    
    # Save resized image
    base_name = os.path.splitext(os.path.basename(image_path))[0]
    output_path = f"output/{base_name}_{width}x{height}.png"
    os.makedirs("output", exist_ok=True)
    resized.save(output_path)
    
    print(f"Resized to {width}x{height} and saved to: {output_path}")
    return output_path

def analyze_image(image_path):
    """Analyze image and output to CSV"""
    img = Image.open(image_path)
    img = img.convert('RGB')  # Ensure RGB mode
    width, height = img.size
    pixels = img.load()
    
    base_name = os.path.splitext(os.path.basename(image_path))[0]
    os.makedirs("output", exist_ok=True)
    
    # Output file paths
    pixels_csv = f"output/{base_name}_pixels.csv"
    by_color_csv = f"output/{base_name}_by_color.csv"
    
    print(f"\nImage size: {width}x{height}")
    print(f"Total pixels: {width * height}")
    
    # Write all pixels to CSV
    with open(pixels_csv, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['x', 'y', 'hex_color', 'r', 'g', 'b'])
        
        for y in range(height):
            for x in range(width):
                r, g, b = pixels[x, y][:3]
                hex_color = rgb_to_hex(r, g, b)
                writer.writerow([x, y, hex_color, r, g, b])
    
    print(f"✓ All pixels written to: {pixels_csv}")
    
    # Group by color
    color_map = {}
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y][:3]
            hex_color = rgb_to_hex(r, g, b)
            
            if hex_color not in color_map:
                color_map[hex_color] = []
            color_map[hex_color].append((x, y))
    
    # Write grouped by color
    with open(by_color_csv, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['color', 'count', 'positions'])
        
        for color in sorted(color_map.keys()):
            positions = color_map[color]
            pos_str = '; '.join([f"({x},{y})" for x, y in positions])
            writer.writerow([color, len(positions), pos_str])
    
    print(f"✓ Grouped by color written to: {by_color_csv}")
    
    # Print color summary
    print(f"\n📊 Color Summary ({len(color_map)} unique colors):")
    for color in sorted(color_map.keys(), key=lambda c: -len(color_map[c])):
        count = len(color_map[color])
        print(f"  {color}: {count} pixels")

def main():
    parser = argparse.ArgumentParser(
        description='Analyze pixel art sprites for game development',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('image', help='Path to input image')
    parser.add_argument('--size', nargs=2, type=int, metavar=('WIDTH', 'HEIGHT'),
                       help='Resize image to WIDTH x HEIGHT before analysis')
    
    args = parser.parse_args()
    
    image_path = args.image
    
    # Resize if requested
    if args.size:
        width, height = args.size
        print(f"Resizing image to {width}x{height}...")
        image_path = resize_image(image_path, width, height)
    
    # Analyze the image
    analyze_image(image_path)
    
    print("\n✅ Analysis complete!")
    print("💡 Tip: Use the by_color.csv file for easy sprite recreation in code")

if __name__ == "__main__":
    main()

