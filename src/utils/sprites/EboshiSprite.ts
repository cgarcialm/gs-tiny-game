import Phaser from "phaser";

/**
 * Creates a pixel art sprite for Eboshi (a greyhound dog) in sitting position
 * Based on the greyhound pixel art description
 */
export function createEboshiSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 2; // Size of each pixel block
  
  // Colors - dark gray silhouette with eyes
  const DOG_DARK_GRAY = 0x1a1a1a;   // Darker gray for dog body
  const OUTLINE_BLACK = 0x000000;   // Black outline
  const EYE_WHITE = 0xcccccc;       // Light gray for eyes
  const EYE_PUPIL = 0x000000;        // Black pupil
  
  // Create graphics object for drawing pixels
  const graphics = scene.add.graphics();
  
  // Offset to center the sprite (simple silhouette: ~20 pixels wide, ~16 pixels tall)
  const spriteWidth = 20;
  const spriteHeight = 16;
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  // Helper to draw a pixel block
  const drawPixel = (px: number, py: number, color: number) => {
    const x = offsetX + px * pixelSize;
    const y = offsetY + py * pixelSize;
    graphics.fillStyle(color, 1.0);
    graphics.fillRect(x, y, pixelSize, pixelSize);
  };
  
  // Helper to draw outline pixels around a specific pixel (only where there's empty space)
  const drawOutlinePixel = (px: number, py: number, direction: 'top' | 'bottom' | 'left' | 'right') => {
    const x = offsetX + px * pixelSize;
    const y = offsetY + py * pixelSize;
    graphics.fillStyle(OUTLINE_BLACK, 1.0);
    switch (direction) {
      case 'top': graphics.fillRect(x, y - pixelSize, pixelSize, pixelSize); break;
      case 'bottom': graphics.fillRect(x, y + pixelSize, pixelSize, pixelSize); break;
      case 'left': graphics.fillRect(x - pixelSize, y, pixelSize, pixelSize); break;
      case 'right': graphics.fillRect(x + pixelSize, y, pixelSize, pixelSize); break;
    }
  };
  
  // Helper to draw a small dot inside a pixel (smaller than the pixel itself)
  const drawSmallDot = (px: number, py: number, color: number, size: number = 1.2) => {
    const x = offsetX + px * pixelSize;
    const y = offsetY + py * pixelSize;
    // Center the dot within the pixel
    const dotX = x + (pixelSize - size) / 2 ;
    const dotY = y + (pixelSize - size) / 2;
    graphics.fillStyle(color, 1.0);
    graphics.fillRect(Math.round(dotX), Math.round(dotY), size, size);
  };
  
  const redrawSprite = () => {
    graphics.clear();
    
    // Simple dark gray silhouette - side view facing right
    // Dark gray, blocky, minimal design
    
    // Draw all body pixels first (no outlines)
    // Ear (pointed, upright)
    drawPixel(5, 1, DOG_DARK_GRAY);
    drawPixel(6, 1, DOG_DARK_GRAY);
    drawPixel(5, 2, DOG_DARK_GRAY);
    
    // Head (small, rectangular)
    drawPixel(3, 2, DOG_DARK_GRAY);
    drawPixel(4, 2, DOG_DARK_GRAY);
    drawPixel(5, 2, DOG_DARK_GRAY);
    drawPixel(3, 3, DOG_DARK_GRAY);
    drawPixel(4, 3, DOG_DARK_GRAY);
    drawPixel(5, 3, DOG_DARK_GRAY);
    
    // Muzzle (short, blocky)
    drawPixel(1, 3, DOG_DARK_GRAY);
    drawPixel(2, 3, DOG_DARK_GRAY);
    drawPixel(3, 3, DOG_DARK_GRAY);  // Already drawn as head
    drawPixel(2, 4, DOG_DARK_GRAY);
    drawPixel(3, 4, DOG_DARK_GRAY);
    
    // Neck
    drawPixel(4, 4, DOG_DARK_GRAY);
    drawPixel(4, 5, DOG_DARK_GRAY);
    
    // Body (robust, rectangular) - extended horizontally
    drawPixel(4, 6, DOG_DARK_GRAY);
    drawPixel(5, 6, DOG_DARK_GRAY);
    drawPixel(6, 6, DOG_DARK_GRAY);
    drawPixel(7, 6, DOG_DARK_GRAY);
    drawPixel(8, 6, DOG_DARK_GRAY);
    drawPixel(9, 6, DOG_DARK_GRAY);
    drawPixel(10, 6, DOG_DARK_GRAY);
    drawPixel(11, 6, DOG_DARK_GRAY);
    
    drawPixel(4, 7, DOG_DARK_GRAY);
    drawPixel(5, 7, DOG_DARK_GRAY);
    drawPixel(6, 7, DOG_DARK_GRAY);
    drawPixel(7, 7, DOG_DARK_GRAY);
    drawPixel(8, 7, DOG_DARK_GRAY);
    drawPixel(9, 7, DOG_DARK_GRAY);
    drawPixel(10, 7, DOG_DARK_GRAY);
    drawPixel(11, 7, DOG_DARK_GRAY);
    drawPixel(12, 7, DOG_DARK_GRAY);
    
    drawPixel(5, 8, DOG_DARK_GRAY);
    drawPixel(6, 8, DOG_DARK_GRAY);
    drawPixel(7, 8, DOG_DARK_GRAY);
    drawPixel(8, 8, DOG_DARK_GRAY);
    drawPixel(9, 8, DOG_DARK_GRAY);
    drawPixel(10, 8, DOG_DARK_GRAY);
    drawPixel(11, 8, DOG_DARK_GRAY);
    drawPixel(12, 8, DOG_DARK_GRAY);
    
    drawPixel(5, 9, DOG_DARK_GRAY);
    drawPixel(6, 9, DOG_DARK_GRAY);
    drawPixel(7, 9, DOG_DARK_GRAY);
    drawPixel(8, 9, DOG_DARK_GRAY);
    drawPixel(11, 9, DOG_DARK_GRAY);
    drawPixel(12, 9, DOG_DARK_GRAY);

    drawPixel(5, 10, DOG_DARK_GRAY);
    
    // Right front leg
    drawPixel(6, 10, DOG_DARK_GRAY);
    drawPixel(6, 11, DOG_DARK_GRAY);
    drawPixel(6, 12, DOG_DARK_GRAY);
    drawPixel(6, 13, DOG_DARK_GRAY);
    drawPixel(5, 13, DOG_DARK_GRAY);
    
    // Back legs (thick, blocky columns with slight hock bend)
    drawPixel(11, 10, DOG_DARK_GRAY);
    drawPixel(12, 10, DOG_DARK_GRAY);
    drawPixel(12, 11, DOG_DARK_GRAY);
    drawPixel(12, 12, DOG_DARK_GRAY);
    drawPixel(12, 13, DOG_DARK_GRAY);
    drawPixel(11, 13, DOG_DARK_GRAY);
    
    // Tail (curled up and forward over back)
    drawPixel(13, 6, DOG_DARK_GRAY);
    drawPixel(14, 5, DOG_DARK_GRAY);
    drawPixel(14, 4, DOG_DARK_GRAY);
    drawPixel(15, 3, DOG_DARK_GRAY);
    drawPixel(15, 2, DOG_DARK_GRAY);
    drawPixel(14, 1, DOG_DARK_GRAY);
    
    // Minimal outline - only the most essential outer edges
    // Top silhouette - ear and head
    drawOutlinePixel(5, 1, 'top');
    // drawOutlinePixel(3, 2, 'right');
    
    // Leftmost point - muzzle tip
    drawOutlinePixel(1, 3, 'left');
    
    // Rightmost point - tail
    drawOutlinePixel(15, 2, 'right');
    drawOutlinePixel(15, 2, 'top');
    
    // Bottom - feet only
    drawOutlinePixel(5, 13, 'bottom');
    drawOutlinePixel(12, 13, 'bottom');
    
    // Eye (side view - visible eye on the face, drawn last so nothing overwrites it)
    // Draw a white eye area with dark pupil inside - placed on head area (not muzzle)
    // Create a 2x2 eye area for better visibility
    drawPixel(4, 2, EYE_WHITE);  // White eye (top-left)
    // drawOutlinePixel(4, 2, 'right');
    // drawPixel(5, 2, EYE_WHITE);  // White eye (top-right)
    // drawPixel(4, 3, EYE_WHITE);  // White eye (bottom-left)
    // drawPixel(5, 3, EYE_WHITE);  // White eye (bottom-right)
    drawSmallDot(4, 2, EYE_PUPIL);  // Small dark pupil inside the white eye (default 1.2 size)
  };
  
  // Initial draw
  redrawSprite();
  
  // Add graphics to container
  container.add(graphics);
  
  // Store redraw function for potential future animations
  container.setData("redraw", redrawSprite);
  
  return container;
}

