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
  // Ensure graphics render properly without transparency artifacts
  graphics.setBlendMode(Phaser.BlendModes.NORMAL);
  
  // Offset to center the sprite (18 pixels wide, 24 pixels tall - bigger character)
  const spriteWidth = 18;
  const spriteHeight = 24;
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  // Helper to draw a pixel block - no outlines
  const drawPixel = (px: number, py: number, color: number) => {
    // Round pixel coordinates to integers to prevent transparency issues
    const roundedPx = Math.round(px);
    const roundedPy = Math.round(py);
    const x = Math.round(offsetX + roundedPx * pixelSize);
    const y = Math.round(offsetY + roundedPy * pixelSize);
    
    // Fill with full opacity - ensure no transparency
    graphics.fillStyle(color, 1.0);
    graphics.fillRect(x, y, pixelSize, pixelSize);
  };
  
  const redrawSprite = (walkFrame: number = 0) => {
    // Clear graphics completely before redrawing
    graphics.clear();
    // Reset blend mode and alpha to ensure full opacity
    graphics.setBlendMode(Phaser.BlendModes.NORMAL);
    
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
    // Upper legs (use integer offsets directly)
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
  
  // Mark graphics as dirty to ensure proper rendering
  graphics.setVisible(true);
  
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

