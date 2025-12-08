import Phaser from "phaser";

/**
 * Creates the player's burgundy van sprite
 * Clean design, rotated slightly for diagonal 3/4 view
 */
export function createVanSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();

  // Colors
  const BURGUNDY_DARK = 0x5a0000;
  const BURGUNDY = 0x8b0000;
  const BURGUNDY_LIGHT = 0xa52a2a;
  const WINDOW = 0x203848;
  const WINDOW_SHINE = 0x405868;
  const TAIL_LIGHT = 0xff3333;
  const BLACK = 0x111111;

  // Shadow (shifted left to match diagonal, narrower)
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(-4, 17, 18, 6);

  // === LEFT FRONT WHEEL (draw first, behind body) ===
  g.fillStyle(BLACK, 1);
  g.fillRect(-15, -14, 4, 10);
  g.fillStyle(0x444444, 1);
  g.fillRect(-14, -12, 2, 6);

  // === LEFT SIDE OF HOOD (above front wheel) ===
  g.fillStyle(BURGUNDY_DARK, 1);
  g.fillRect(-12, -20, 3, 6);

  // === MAIN BODY ===
  g.fillStyle(BURGUNDY, 1);
  g.fillRect(-9, -10, 18, 26);

  // === LEFT SIDE (depth) ===
  g.fillStyle(BURGUNDY_DARK, 1);
  g.fillRect(-12, -10, 3, 26);

  // === ROOF ===
  g.fillStyle(BURGUNDY_DARK, 1);
  g.fillRect(-11, -16, 18, 6);

  // === HOOD ===
  g.fillStyle(BURGUNDY, 1);
  g.fillRoundedRect(-9, -20, 12, 5, 2);  // Rounded corners, shorter
  g.fillStyle(BURGUNDY_LIGHT, 1);
  g.fillRoundedRect(-7, -19, 8, 3, 1);

  // === FRONT WINDSHIELD ===
  g.fillStyle(WINDOW, 1);
  g.fillRect(-8, -15, 13, 4);  // Narrower to not stick past pillar
  g.fillStyle(WINDOW_SHINE, 0.5);
  g.fillRect(-3, -14, 5, 2);

  // === LEFT SIDE WINDOWS (extended upward) ===
  g.fillStyle(WINDOW, 1);
  g.fillRect(-8, -8, 2, 17);

  // === BODY HIGHLIGHT ===
  g.fillStyle(BURGUNDY_LIGHT, 1);
  g.fillRoundedRect(-4, -8, 11, 18, 10);

  // === REAR WINDOW (back windshield, drawn after highlight) ===
  // g.fillStyle(0x101820, 1);  // Dark border
  // g.fillRect(-5, 0, 9, 7);
  g.fillStyle(WINDOW, 1);
  g.fillRect(-4, 5, 11, 5);
  g.fillStyle(WINDOW_SHINE, 0.4);
  g.fillRect(0, 5, 3, 3);

  // === ROOF RACK ===
  g.fillStyle(0x333333, 1);
  g.fillRect(-6, -11, 10, 2);

  // === TAIL LIGHTS ===
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-8, 12, 4, 3);
  g.fillRect(4, 12, 4, 3);

  // === LICENSE PLATE ===
  g.fillStyle(0xdddddd, 1);
  g.fillRect(-2, 13, 5, 2);

  // === BUMPER ===
  g.fillStyle(0x222222, 1);
  g.fillRect(-10, 16, 18, 3);

  // === LEFT REAR WHEEL ===
  g.fillStyle(BLACK, 1);
  g.fillRect(-15, 4, 4, 12);
  g.fillStyle(0x444444, 1);
  g.fillRect(-14, 6, 2, 8);

  // === RIGHT REAR WHEEL ===
  g.fillStyle(BLACK, 1);
  g.fillRect(8, 8, 3, 8);

  container.add(g);
  
  // Rotate slightly for diagonal effect (negative = top goes left)
  container.setAngle(-12);
  
  return container;
}
