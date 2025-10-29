import Phaser from "phaser";

/**
 * Helper to draw a pixel block
 */
export function createDrawPixel(
  graphics: Phaser.GameObjects.Graphics,
  pixelSize: number,
  offsetX: number,
  offsetY: number
) {
  return (px: number, py: number, color: number) => {
    const roundedPx = Math.round(px);
    const roundedPy = Math.round(py);
    const x = Math.round(offsetX + roundedPx * pixelSize);
    const y = Math.round(offsetY + roundedPy * pixelSize);
    
    graphics.fillStyle(color, 1.0);
    graphics.fillRect(x, y, pixelSize, pixelSize);
  };
}

/**
 * Helper to draw a small dot inside a pixel (for pupils, etc)
 */
export function createDrawSmallDot(
  graphics: Phaser.GameObjects.Graphics,
  pixelSize: number,
  offsetX: number,
  offsetY: number
) {
  return (px: number, py: number, color: number, size: number = 1.2) => {
    const x = offsetX + px * pixelSize;
    const y = offsetY + py * pixelSize;
    // Center the dot within the pixel
    const dotX = x + (pixelSize - size) / 2;
    const dotY = y + (pixelSize - size) / 2;
    graphics.fillStyle(color, 1.0);
    graphics.fillRect(Math.round(dotX), Math.round(dotY), size, size);
  };
}

/**
 * Helper to draw outline pixels around a specific pixel
 */
export function createDrawOutlinePixel(
  graphics: Phaser.GameObjects.Graphics,
  pixelSize: number,
  offsetX: number,
  offsetY: number,
  outlineColor: number
) {
  return (px: number, py: number, direction: 'top' | 'bottom' | 'left' | 'right') => {
    const x = offsetX + px * pixelSize;
    const y = offsetY + py * pixelSize;
    graphics.fillStyle(outlineColor, 1.0);
    switch (direction) {
      case 'top': graphics.fillRect(x, y - pixelSize, pixelSize, pixelSize); break;
      case 'bottom': graphics.fillRect(x, y + pixelSize, pixelSize, pixelSize); break;
      case 'left': graphics.fillRect(x - pixelSize, y, pixelSize, pixelSize); break;
      case 'right': graphics.fillRect(x + pixelSize, y, pixelSize, pixelSize); break;
    }
  };
}

