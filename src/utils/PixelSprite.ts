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
  
  // Colors - brighter and vibrant, no transparency
  const SKIN_LIGHT = 0xffe5cc;      // Brighter light skin tone
  const SKIN_DARK = 0xffd4a3;       // Slightly darker for shading
  const CAP_BLUE = 0x4fc3f7;        // Bright blue baseball cap
  const CAP_YELLOW = 0xffeb3b;      // Bright yellow L detail
  const SHIRT_GREEN = 0x81c784;     // Bright green t-shirt
  const PANTS_BLUE = 0x42a5f5;      // Bright blue pants
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
  
  // Colors - pure black silhouette
  const BLACK = 0x000000;            // Pure black silhouette
  
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
  
  const redrawSprite = () => {
    graphics.clear();
    
    // Simple black silhouette - side view facing right
    // Pure black, blocky, minimal design
    
    // Ear (pointed, upright)
    drawPixel(2, 1, BLACK);
    drawPixel(3, 1, BLACK);
    drawPixel(2, 2, BLACK);
    
    // Head (small, rectangular)
    drawPixel(3, 2, BLACK);
    drawPixel(4, 2, BLACK);
    drawPixel(5, 2, BLACK);
    drawPixel(3, 3, BLACK);
    drawPixel(4, 3, BLACK);
    drawPixel(5, 3, BLACK);
    
    // Muzzle (short, blocky)
    drawPixel(5, 3, BLACK);
    drawPixel(6, 3, BLACK);
    drawPixel(6, 4, BLACK);
    
    // Neck
    drawPixel(4, 4, BLACK);
    drawPixel(4, 5, BLACK);
    
    // Body (robust, rectangular) - extended horizontally
    drawPixel(4, 6, BLACK);
    drawPixel(5, 6, BLACK);
    drawPixel(6, 6, BLACK);
    drawPixel(7, 6, BLACK);
    drawPixel(8, 6, BLACK);
    drawPixel(9, 6, BLACK);
    drawPixel(10, 6, BLACK);
    drawPixel(11, 6, BLACK);
    
    drawPixel(4, 7, BLACK);
    drawPixel(5, 7, BLACK);
    drawPixel(6, 7, BLACK);
    drawPixel(7, 7, BLACK);
    drawPixel(8, 7, BLACK);
    drawPixel(9, 7, BLACK);
    drawPixel(10, 7, BLACK);
    drawPixel(11, 7, BLACK);
    drawPixel(12, 7, BLACK);
    
    drawPixel(5, 8, BLACK);
    drawPixel(6, 8, BLACK);
    drawPixel(7, 8, BLACK);
    drawPixel(8, 8, BLACK);
    drawPixel(9, 8, BLACK);
    drawPixel(10, 8, BLACK);
    drawPixel(11, 8, BLACK);
    drawPixel(12, 8, BLACK);
    
    drawPixel(6, 9, BLACK);
    drawPixel(7, 9, BLACK);
    drawPixel(8, 9, BLACK);
    drawPixel(9, 9, BLACK);
    drawPixel(10, 9, BLACK);
    drawPixel(11, 9, BLACK);
    drawPixel(12, 9, BLACK);
    
    // Front legs (thick, blocky columns - uniformly thick)
    // Left front leg
    drawPixel(5, 10, BLACK);
    drawPixel(6, 10, BLACK); // 2 pixels wide
    
    drawPixel(5, 11, BLACK);
    drawPixel(6, 11, BLACK); // Uniform width
    
    drawPixel(5, 12, BLACK);
    drawPixel(6, 12, BLACK); // Uniform width
    
    drawPixel(5, 13, BLACK);
    drawPixel(6, 13, BLACK); // Uniform width throughout
    
    // Right front leg
    drawPixel(6, 10, BLACK);
    drawPixel(7, 10, BLACK); // 2 pixels wide
    
    drawPixel(6, 11, BLACK);
    drawPixel(7, 11, BLACK); // Uniform width
    
    drawPixel(6, 12, BLACK);
    drawPixel(7, 12, BLACK); // Uniform width
    
    drawPixel(6, 13, BLACK);
    drawPixel(7, 13, BLACK); // Uniform width throughout
    
    // Back legs (thick, blocky columns with slight hock bend)
    // Left back leg
    drawPixel(11, 10, BLACK);
    drawPixel(12, 10, BLACK); // 2 pixels wide
    
    drawPixel(11, 11, BLACK);
    drawPixel(12, 11, BLACK); // Uniform width
    
    drawPixel(11, 12, BLACK);
    drawPixel(12, 12, BLACK); // Uniform width
    
    drawPixel(11, 13, BLACK); // Slight hock bend
    drawPixel(12, 13, BLACK); // Thick foot
    
    // Right back leg
    drawPixel(12, 10, BLACK);
    drawPixel(13, 10, BLACK); // 2 pixels wide
    
    drawPixel(12, 11, BLACK);
    drawPixel(13, 11, BLACK); // Uniform width
    
    drawPixel(12, 12, BLACK);
    drawPixel(13, 12, BLACK); // Uniform width
    
    drawPixel(13, 13, BLACK); // Hock bend area - thick foot
    drawPixel(14, 13, BLACK); // Hock bend extends
    
    // Tail (curled up and forward over back) - moved further right
    drawPixel(13, 6, BLACK);
    drawPixel(14, 5, BLACK);
    drawPixel(14, 4, BLACK);
    drawPixel(15, 3, BLACK);
    drawPixel(15, 2, BLACK);
    drawPixel(14, 1, BLACK);
  };
  
  // Initial draw
  redrawSprite();
  
  // Add graphics to container
  container.add(graphics);
  
  // Store redraw function for potential future animations
  container.setData("redraw", redrawSprite);
  
  return container;
}
