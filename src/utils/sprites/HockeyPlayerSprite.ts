import Phaser from "phaser";

/**
 * Creates a top-down hockey player sprite (enemy)
 * @param scene The Phaser scene
 * @param x X position
 * @param y Y position
 * @param jerseyColor Main jersey color
 * @param accentColor Accent/stripe color
 */
export function createHockeyPlayerSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  jerseyColor: number,
  accentColor: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const graphics = scene.add.graphics();

  // Colors
  const SKIN = 0xffe5cc;           // Skin tone
  const STICK_BROWN = 0x5d4037;    // Hockey stick
  const GLOVE = 0x333333;          // Dark gray gloves
  const HELMET = 0x666666;         // Gray helmet

  const drawSprite = () => {
    graphics.clear();
    
    // Draw top-down hockey player (looking down)
    // Draw order: back to front (stick drawn last to be on top)
    
    // Helmet (top of head) - rounded, gray
    graphics.fillStyle(HELMET, 1);
    // Draw rounded helmet (top part)
    graphics.fillRect(-4, -9, 8, 2); // Top (narrower)
    graphics.fillRect(-5, -7, 10, 4); // Middle (wider)
    
    // Face opening (skin visible through helmet)
    graphics.fillStyle(SKIN, 1);
    graphics.fillRect(-4, -5, 8, 2); // Skin tone where face shows
    
    // Shoulders/jersey (main body)
    graphics.fillStyle(jerseyColor, 1);
    graphics.fillRect(-6, -3, 12, 11);
    
    // Jersey stripe/accent (horizontal red)
    graphics.fillStyle(accentColor, 1);
    graphics.fillRect(-6, 2, 12, 2);
    
    // Pants/lower body - medium legs (no number)
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRect(-4, 8, 3, 2); // Left leg
    graphics.fillRect(1, 8, 3, 2);  // Right leg
    
    // Skates - more visible with boot and blade
    // Left skate - boot (black) + blade (silver)
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRect(-5, 10, 4, 2); // Left boot
    graphics.fillStyle(0xc0c0c0, 1);
    graphics.fillRect(-6, 11, 5, 1); // Left blade (extends out)
    
    // Right skate - boot (black) + blade (silver)
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRect(1, 10, 4, 2); // Right boot
    graphics.fillStyle(0xc0c0c0, 1);
    graphics.fillRect(1, 11, 5, 1); // Right blade (extends out)
    
    // Right glove
    graphics.fillStyle(GLOVE, 1);
    graphics.fillCircle(6, 3, 2);
    
    // Hockey stick (drawn LAST so it's on top of jersey)
    graphics.lineStyle(3, STICK_BROWN, 1);
    graphics.beginPath();
    graphics.moveTo(-9, -2); // Top left
    graphics.lineTo(5, 6);   // Bottom right
    graphics.strokePath();
    
    // Left glove/hand on stick (upper) - drawn on top
    graphics.fillStyle(GLOVE, 1);
    graphics.fillCircle(-7, 0, 2.5);
  };

  drawSprite();
  container.add(graphics);
  
  return container;
}

