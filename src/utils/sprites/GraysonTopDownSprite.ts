import Phaser from "phaser";

/**
 * Creates a top-down view sprite for Grayson (for ice hockey scene)
 * Simple top-down pixel art version
 */
export function createGraysonTopDownSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const graphics = scene.add.graphics();

  // Colors
  const CAP_BLUE = 0x00d4ff;        // Bright cyan blue cap
  const SHIRT_GREEN = 0x81c784;     // Green t-shirt
  const PANTS_BLUE = 0x00bfff;      // Blue pants
  const SKIN = 0xffe5cc;            // Skin tone
  const SHOE_BROWN = 0x3e2723;      // Brown shoes

  const drawSprite = () => {
    graphics.clear();
    
    // Draw top-down view (looking down at Grayson)
    // Width: 12px, Height: 16px
    
    // Cap (top of head)
    graphics.fillStyle(CAP_BLUE, 1);
    graphics.fillRect(-6, -8, 12, 4);
    
    // Head/face (skin)
    graphics.fillStyle(SKIN, 1);
    graphics.fillRect(-5, -4, 10, 3);
    
    // Shoulders/torso (shirt - green)
    graphics.fillStyle(SHIRT_GREEN, 1);
    graphics.fillRect(-6, -1, 12, 6);
    
    // Pants/legs
    graphics.fillStyle(PANTS_BLUE, 1);
    graphics.fillRect(-5, 5, 4, 3); // Left leg
    graphics.fillRect(1, 5, 4, 3);  // Right leg
    
    // Shoes
    graphics.fillStyle(SHOE_BROWN, 1);
    graphics.fillRect(-5, 8, 4, 1); // Left shoe
    graphics.fillRect(1, 8, 4, 1);  // Right shoe
  };

  drawSprite();
  container.add(graphics);
  
  return container;
}

/**
 * Rotate the top-down sprite to face a direction
 * @param sprite The sprite container
 * @param angle Angle in degrees (0 = up, 90 = right, 180 = down, 270 = left)
 */
export function rotateTopDownSprite(sprite: Phaser.GameObjects.Container, angle: number) {
  sprite.setAngle(angle);
}

