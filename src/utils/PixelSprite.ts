import Phaser from "phaser";

/**
 * Creates a pixel art sprite for Grayson with walking animation
 * More detailed version with more pixels
 */
export function createGraysonSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 2; // Size of each pixel block
  
  // Colors - bright neon 80s aesthetic
  const SKIN_LIGHT = 0xffe5cc;      // Light skin tone
  const SKIN_DARK = 0xffd4a3;       // Slightly darker for shading
  const CAP_BLUE = 0x00d4ff;        // Bright neon cyan blue cap
  const CAP_YELLOW = 0xffeb3b;      // Bright neon yellow L detail
  const SHIRT_GREEN = 0x81c784;     // Original bright green t-shirt
  const PANTS_BLUE = 0x00bfff;      // Bright neon blue pants
  const EYES_BLACK = 0x212121;      // Dark gray for eyes
  const MOUTH = 0x424242;           // Dark gray for mouth
  
  // Create graphics object for drawing pixels
  const graphics = scene.add.graphics();
  
  // Offset to center the sprite (18 pixels wide, 24 pixels tall - bigger character)
  const spriteWidth = 18;
  const spriteHeight = 24;
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  // Helper to draw a pixel block - no outlines
  const drawPixel = (px: number, py: number, color: number) => {
    const x = offsetX + px * pixelSize;
    const y = offsetY + py * pixelSize;
    
    // Fill with full opacity - no transparency, no outlines
    graphics.fillStyle(color, 1.0);
    graphics.fillRect(x, y, pixelSize, pixelSize);
  };
  
  const redrawSprite = (walkFrame: number = 0) => {
    graphics.clear();
    
    // Determine leg position for walking animation
    const legFrame = Math.floor(walkFrame) % 2;
    const leftLegOffset = legFrame === 0 ? 0.2 : -0.2;
    const rightLegOffset = -leftLegOffset;
    
    // Cap (rows 0-2)
    // Top of cap
    drawPixel(4, 0, CAP_BLUE);
    drawPixel(5, 0, CAP_BLUE);
    drawPixel(6, 0, CAP_BLUE);
    drawPixel(7, 0, CAP_BLUE);
    drawPixel(8, 0, CAP_BLUE);
    
    // Cap middle with yellow L detail
    drawPixel(4, 1, CAP_BLUE);
    drawPixel(5, 1, CAP_BLUE);
    drawPixel(6, 1, CAP_BLUE);
    drawPixel(7, 1, CAP_BLUE);
    drawPixel(8, 1, CAP_BLUE);
    drawPixel(9, 1, CAP_BLUE);
    drawPixel(9, 2, CAP_BLUE);
    drawPixel(9, 3, CAP_YELLOW); // Yellow L detail
    drawPixel(9, 4, CAP_YELLOW);
    
    // Cap brim
    drawPixel(2, 2, CAP_BLUE);
    drawPixel(3, 2, CAP_BLUE);
    drawPixel(4, 2, CAP_BLUE);
    drawPixel(5, 2, CAP_BLUE);
    drawPixel(6, 2, CAP_BLUE);
    drawPixel(7, 2, CAP_BLUE);
    drawPixel(8, 2, CAP_BLUE);
    
    // Face (skin) - bigger and more detailed (rows 3-6)
    // Top of face
    drawPixel(4, 3, SKIN_LIGHT);
    drawPixel(5, 3, SKIN_LIGHT);
    drawPixel(6, 3, SKIN_LIGHT);
    drawPixel(7, 3, SKIN_LIGHT);
    drawPixel(8, 3, SKIN_LIGHT);
    
    // Face middle with eyes
    drawPixel(4, 4, SKIN_LIGHT);
    drawPixel(5, 4, EYES_BLACK);      // Left eye
    drawPixel(6, 4, SKIN_DARK);       // Nose shading
    drawPixel(7, 4, EYES_BLACK);      // Right eye
    drawPixel(8, 4, SKIN_LIGHT);
    
    // Face lower
    drawPixel(4, 5, SKIN_LIGHT);
    drawPixel(5, 5, SKIN_LIGHT);
    drawPixel(6, 5, MOUTH);           // Mouth
    drawPixel(7, 5, SKIN_LIGHT);
    drawPixel(8, 5, SKIN_LIGHT);
    
    // Chin/neck area
    drawPixel(5, 6, SKIN_LIGHT);
    drawPixel(6, 6, SKIN_LIGHT);
    drawPixel(7, 6, SKIN_LIGHT);
    
    // Shirt (rows 7-10) - more detailed
    // Top of shirt
    drawPixel(4, 7, SHIRT_GREEN);
    drawPixel(5, 7, SHIRT_GREEN);
    drawPixel(6, 7, SHIRT_GREEN);
    drawPixel(7, 7, SHIRT_GREEN);
    drawPixel(8, 7, SHIRT_GREEN);
    
    // Shirt body with arms
    drawPixel(3, 8, SHIRT_GREEN);
    drawPixel(4, 8, SHIRT_GREEN);
    drawPixel(5, 8, SHIRT_GREEN);
    drawPixel(6, 8, SHIRT_GREEN);
    drawPixel(7, 8, SHIRT_GREEN);
    drawPixel(8, 8, SHIRT_GREEN);
    drawPixel(9, 8, SHIRT_GREEN);
    
    drawPixel(3, 9, SHIRT_GREEN);
    drawPixel(4, 9, SHIRT_GREEN);
    drawPixel(5, 9, SHIRT_GREEN);
    drawPixel(6, 9, SHIRT_GREEN);
    drawPixel(7, 9, SHIRT_GREEN);
    drawPixel(8, 9, SHIRT_GREEN);
    drawPixel(9, 9, SHIRT_GREEN);
    
    drawPixel(4, 10, SHIRT_GREEN);
    drawPixel(5, 10, SHIRT_GREEN);
    drawPixel(6, 10, SHIRT_GREEN);
    drawPixel(7, 10, SHIRT_GREEN);
    drawPixel(8, 10, SHIRT_GREEN);
    
    // Waist/Belt area
    drawPixel(4, 11, PANTS_BLUE);
    drawPixel(5, 11, PANTS_BLUE);
    drawPixel(6, 11, PANTS_BLUE);
    drawPixel(7, 11, PANTS_BLUE);
    drawPixel(8, 11, PANTS_BLUE);
    
    // Pants with walking animation (rows 12-15) - shorter but more detailed
    // Upper legs
    drawPixel(4 + leftLegOffset, 12, PANTS_BLUE);
    drawPixel(5, 12, PANTS_BLUE);
    drawPixel(6, 12, PANTS_BLUE);
    drawPixel(7 + rightLegOffset, 12, PANTS_BLUE);
    drawPixel(8 + rightLegOffset, 12, PANTS_BLUE);
    
    // Lower legs
    drawPixel(4 + leftLegOffset, 13, PANTS_BLUE);
    drawPixel(5, 13, PANTS_BLUE);
    drawPixel(7 + rightLegOffset, 13, PANTS_BLUE);
    drawPixel(8 + rightLegOffset, 13, PANTS_BLUE);
    
    // Feet/Ankles with walking animation
    drawPixel(4 + leftLegOffset, 14, PANTS_BLUE);
    drawPixel(5, 14, PANTS_BLUE);
    drawPixel(7 + rightLegOffset, 14, PANTS_BLUE);
    drawPixel(8 + rightLegOffset, 14, PANTS_BLUE);
    
    // Feet bottom
  };
  
  // Initial draw (idle position)
  redrawSprite(0);
  
  // Add graphics to container
  container.add(graphics);
  
  // Store animation data
  container.setData("walkFrame", 0);
  container.setData("redraw", redrawSprite);
  
  return container;
}

/**
 * Update walking animation for Grayson sprite
 */
export function updateGraysonWalk(
  sprite: Phaser.GameObjects.Container,
  isMoving: boolean
) {
  const redrawFunc = sprite.getData("redraw");
  if (!redrawFunc) return;
  
  if (isMoving) {
    let frame = sprite.getData("walkFrame") || 0;
    frame += 0.4; // Animation speed
    sprite.setData("walkFrame", frame);
    redrawFunc(frame);
  } else {
    // Return to idle position
    sprite.setData("walkFrame", 0);
    redrawFunc(0);
  }
}

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
