import Phaser from "phaser";

/**
 * Creates a pixel art sprite for Grayson with walking animation
 * Based on the reference: blue baseball cap with yellow L, light skin, green shirt, dark blue pants
 */
export function createGraysonSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 3; // Size of each pixel block
  
  // Colors - brighter and vibrant, no transparency
  const SKIN_LIGHT = 0xffe5cc;      // Brighter light skin tone
  const CAP_BLUE = 0x4fc3f7;         // Bright blue baseball cap
  const CAP_YELLOW = 0xffeb3b;      // Bright yellow L detail
  const SHIRT_GREEN = 0x81c784;      // Bright green t-shirt
  const PANTS_BLUE = 0x42a5f5;       // Bright blue pants
  const EYES_BLACK = 0x212121;       // Dark gray (softer than pure black)
  
  // Create graphics object for drawing pixels
  const graphics = scene.add.graphics();
  
  // Offset to center the sprite (8 pixels wide, 12 pixels tall)
  const offsetX = -(8 * pixelSize) / 2;
  const offsetY = -(12 * pixelSize) / 2;
  
  // Helper to draw a pixel block - only outline outer edges
  const drawPixel = (px: number, py: number, color: number, drawOutline: boolean = false) => {
    const x = offsetX + px * pixelSize;
    const y = offsetY + py * pixelSize;
    
    // Fill with full opacity - no transparency
    graphics.fillStyle(color, 1.0);
    graphics.fillRect(x, y, pixelSize, pixelSize);
    
    // Only draw subtle outline on outer edges
    if (drawOutline) {
      graphics.lineStyle(0.5, 0x333333, 0.5);
      graphics.strokeRect(x, y, pixelSize, pixelSize);
    }
  };
  
  const redrawSprite = (walkFrame: number = 0) => {
    graphics.clear();
    
    // Determine leg position for walking animation
    const legFrame = Math.floor(walkFrame) % 2;
    const leftLegOffset = legFrame === 0 ? 0.15 : -0.15;
    const rightLegOffset = -leftLegOffset;
    
    // Character is 8 pixels wide, 12 pixels tall
    // Cap (top row) - outline only outer edges
    drawPixel(2, 0, CAP_BLUE);
    drawPixel(3, 0, CAP_BLUE);
    drawPixel(4, 0, CAP_BLUE);
    drawPixel(5, 0, CAP_BLUE);
    drawPixel(6, 0, CAP_BLUE);
    drawPixel(6, 1, CAP_BLUE);
    // Yellow L on cap
    drawPixel(6, 2, CAP_YELLOW);
    drawPixel(6, 3, CAP_YELLOW);
    
    // Cap brim - outline outer edge
    drawPixel(1, 1, CAP_BLUE, true);
    drawPixel(2, 1, CAP_BLUE);
    drawPixel(3, 1, CAP_BLUE);
    drawPixel(4, 1, CAP_BLUE);
    drawPixel(5, 1, CAP_BLUE);
    
    // Face (skin) - outline only edges
    drawPixel(2, 2, SKIN_LIGHT, true);
    drawPixel(3, 2, SKIN_LIGHT);
    drawPixel(4, 2, SKIN_LIGHT);
    drawPixel(5, 2, SKIN_LIGHT, true);
    
    drawPixel(2, 3, SKIN_LIGHT, true);
    drawPixel(3, 3, SKIN_LIGHT);
    drawPixel(4, 3, SKIN_LIGHT);
    drawPixel(5, 3, SKIN_LIGHT, true);
    
    // Eyes
    drawPixel(2, 2, EYES_BLACK);
    drawPixel(4, 2, EYES_BLACK);
    
    // Mouth
    drawPixel(2, 6, EYES_BLACK);
    drawPixel(4, 6, EYES_BLACK);
    
    // Neck/Upper body (shirt) - outline edges only
    drawPixel(2, 4, SKIN_LIGHT, true);
    drawPixel(5, 4, SKIN_LIGHT, true);
    
    drawPixel(2, 5, SHIRT_GREEN, true);
    drawPixel(3, 5, SHIRT_GREEN);
    drawPixel(4, 5, SHIRT_GREEN);
    drawPixel(5, 5, SHIRT_GREEN, true);
    
    drawPixel(1, 6, SHIRT_GREEN, true);
    drawPixel(2, 6, SHIRT_GREEN);
    drawPixel(3, 6, SHIRT_GREEN);
    drawPixel(4, 6, SHIRT_GREEN);
    drawPixel(5, 6, SHIRT_GREEN);
    drawPixel(6, 6, SHIRT_GREEN, true);
    
    drawPixel(1, 7, SHIRT_GREEN, true);
    drawPixel(2, 7, SHIRT_GREEN);
    drawPixel(3, 7, SHIRT_GREEN);
    drawPixel(4, 7, SHIRT_GREEN);
    drawPixel(5, 7, SHIRT_GREEN);
    drawPixel(6, 7, SHIRT_GREEN, true);
    
    // Waist/Pants top
    drawPixel(2, 8, PANTS_BLUE, true);
    drawPixel(3, 8, PANTS_BLUE);
    drawPixel(4, 8, PANTS_BLUE);
    drawPixel(5, 8, PANTS_BLUE, true);
    
    // Pants with walking animation - legs alternate position
    drawPixel(2 + leftLegOffset, 9, PANTS_BLUE);
    drawPixel(3, 9, PANTS_BLUE);
    drawPixel(4, 9, PANTS_BLUE);
    drawPixel(5 + rightLegOffset, 9, PANTS_BLUE);
    
    drawPixel(2 + leftLegOffset, 10, PANTS_BLUE);
    drawPixel(3, 10, PANTS_BLUE);
    drawPixel(4, 10, PANTS_BLUE);
    drawPixel(5 + rightLegOffset, 10, PANTS_BLUE);
    
    // Legs/Feet with walking animation - outline outer edges
    drawPixel(2 + leftLegOffset, 11, PANTS_BLUE, true);
    drawPixel(3, 11, PANTS_BLUE);
    drawPixel(4, 11, PANTS_BLUE);
    drawPixel(5 + rightLegOffset, 11, PANTS_BLUE, true);
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
