import Phaser from "phaser";

/**
 * Traffic car sprites - clean design with rotation for diagonal view
 */
export function createTrafficCarSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  carType: number,
  color: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();

  const darkerColor = ((color >> 1) & 0x7f7f7f);
  const lighterColor = color | 0x404040;

  switch (carType) {
    case 0:
      drawSedan(g, color, darkerColor, lighterColor);
      break;
    case 1:
      drawSUV(g, color, darkerColor, lighterColor);
      break;
    case 2:
      drawCompact(g, color, darkerColor, lighterColor);
      break;
    case 3:
      drawPickup(g, color, darkerColor, lighterColor);
      break;
    default:
      drawSedan(g, color, darkerColor, lighterColor);
  }

  container.add(g);
  
  // Scale up for better visibility
  container.setScale(2);
  
  // Rotate for diagonal effect
  container.setAngle(-12);
  
  return container;
}

function drawSedan(g: Phaser.GameObjects.Graphics, color: number, dark: number, light: number) {
  const WINDOW = 0x203848;
  const TAIL_LIGHT = 0xff3333;
  const BLACK = 0x111111;

  // Shadow
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(1, 8, 16, 4);

  // Left front wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-11, -8, 3, 7);

  // Left side of hood
  g.fillStyle(dark, 1);
  g.fillRect(-9, -12, 2, 4);

  // Main body (shorter, wider - sedan shape)
  g.fillStyle(color, 1);
  g.fillRect(-6, -6, 12, 14);

  // Left side
  g.fillStyle(dark, 1);
  g.fillRect(-9, -6, 3, 14);

  // Roof (shorter - doesn't reach back)
  g.fillStyle(dark, 1);
  g.fillRect(-7, -10, 10, 4);

  // Hood (longer)
  g.fillStyle(color, 1);
  g.fillRect(-6, -12, 10, 3);

  // Front windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-5, -9, 9, 3);

  // Left side window
  g.fillStyle(WINDOW, 1);
  g.fillRect(-8, -7, 2, 8);

  // Trunk area (behind roof)
  g.fillStyle(color, 1);
  g.fillRect(-5, -6, 10, 4);
  g.fillStyle(light, 1);
  g.fillRect(-4, -5, 8, 3);

  // Rear windshield (visible, slanted)
  g.fillStyle(WINDOW, 1);
  g.fillRect(-4, -2, 7, 3);

  // Body highlight
  g.fillStyle(light, 1);
  g.fillRect(-3, 1, 7, 5);

  // Tail lights
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-5, 5, 3, 2);
  g.fillRect(3, 5, 3, 2);

  // Left rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-11, 1, 3, 7);

  // Right rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(6, 2, 2, 5);
}

function drawSUV(g: Phaser.GameObjects.Graphics, color: number, dark: number, light: number) {
  const WINDOW = 0x203848;
  const TAIL_LIGHT = 0xff3333;
  const BLACK = 0x111111;

  // Shadow
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(1, 14, 18, 5);

  // Left front wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-12, -12, 4, 10);

  // Left side of hood
  g.fillStyle(dark, 1);
  g.fillRect(-10, -17, 3, 5);

  // Main body
  g.fillStyle(color, 1);
  g.fillRect(-7, -10, 14, 24);

  // Left side
  g.fillStyle(dark, 1);
  g.fillRect(-10, -10, 3, 24);

  // Roof (shorter)
  g.fillStyle(dark, 1);
  g.fillRect(-8, -14, 12, 4);

  // Hood
  g.fillStyle(color, 1);
  g.fillRect(-7, -17, 12, 4);

  // Front windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-6, -13, 11, 3);

  // Left side windows (shorter)
  g.fillStyle(WINDOW, 1);
  g.fillRect(-9, -11, 2, 12);

  // Rear section
  g.fillStyle(color, 1);
  g.fillRect(-6, -10, 12, 6);
  g.fillStyle(light, 1);
  g.fillRect(-5, -9, 10, 4);

  // Rear windshield (visible)
  g.fillStyle(WINDOW, 1);
  g.fillRect(-5, -4, 9, 4);

  // Body highlight
  g.fillStyle(light, 1);
  g.fillRect(-4, 0, 9, 11);

  // Tail lights
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-6, 10, 4, 3);
  g.fillRect(3, 10, 4, 3);

  // Left rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-12, 4, 4, 10);

  // Right rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(7, 6, 3, 7);
}

function drawCompact(g: Phaser.GameObjects.Graphics, color: number, dark: number, light: number) {
  const WINDOW = 0x203848;
  const TAIL_LIGHT = 0xff3333;
  const BLACK = 0x111111;

  // Shadow (small)
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(1, 6, 12, 3);

  // Left front wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-8, -6, 2, 5);

  // Left side of hood
  g.fillStyle(dark, 1);
  g.fillRect(-7, -9, 2, 3);

  // Main body (short hatchback)
  g.fillStyle(color, 1);
  g.fillRect(-5, -4, 9, 10);

  // Left side
  g.fillStyle(dark, 1);
  g.fillRect(-7, -4, 2, 10);

  // Roof (shorter - doesn't reach back)
  g.fillStyle(dark, 1);
  g.fillRect(-6, -7, 8, 3);

  // Hood (short)
  g.fillStyle(color, 1);
  g.fillRect(-5, -9, 8, 3);

  // Front windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-4, -6, 7, 2);

  // Left side window (shorter)
  g.fillStyle(WINDOW, 1);
  g.fillRect(-6, -5, 2, 5);

  // Trunk/rear area
  g.fillStyle(color, 1);
  g.fillRect(-4, -4, 7, 3);
  g.fillStyle(light, 1);
  g.fillRect(-3, -3, 5, 2);

  // Rear windshield (visible)
  g.fillStyle(WINDOW, 1);
  g.fillRect(-3, -1, 5, 2);

  // Body highlight
  g.fillStyle(light, 1);
  g.fillRect(-3, 1, 6, 4);

  // Tail lights
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-4, 4, 2, 2);
  g.fillRect(2, 4, 2, 2);

  // Left rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-8, 1, 2, 5);

  // Right rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(4, 2, 2, 4);
}

function drawPickup(g: Phaser.GameObjects.Graphics, color: number, dark: number, light: number) {
  const WINDOW = 0x203848;
  const TAIL_LIGHT = 0xff3333;
  const BLACK = 0x111111;

  // Shadow
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(1, 14, 18, 5);

  // Left front wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-13, -12, 4, 9);

  // Left side of hood
  g.fillStyle(dark, 1);
  g.fillRect(-10, -16, 3, 4);

  // Cab
  g.fillStyle(color, 1);
  g.fillRect(-7, -13, 13, 13);

  // Cab left side
  g.fillStyle(dark, 1);
  g.fillRect(-10, -13, 4, 13);

  // Bed
  g.fillStyle(color, 1);
  g.fillRect(-7, 0, 13, 13);

  // Bed left wall
  g.fillStyle(dark, 1);
  g.fillRect(-10, 0, 4, 13);

  // Bed interior
  g.fillStyle(0x1a1a1a, 1);
  g.fillRect(-5, 1, 9, 8);

  // Hood
  g.fillStyle(color, 1);
  g.fillRect(-5, -16, 10, 4);

  // Front windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-4, -12, 9, 4);

  // Left cab window
  g.fillStyle(WINDOW, 1);
  g.fillRect(-9, -10, 3, 9);

  // Rear cab window
  g.fillStyle(WINDOW, 1);
  g.fillRect(-4, -5, 8, 4);

  // Cab highlight
  g.fillStyle(light, 1);
  g.fillRect(-4, -10, 8, 8);

  // Tail lights
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-5, 10, 4, 3);
  g.fillRect(3, 10, 4, 3);

  // Left rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-13, 4, 4, 9);

  // Right rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(7, 5, 3, 7);
}

export function getRandomCarColor(): number {
  const colors = [
    0x2244aa, 0xaa2222, 0xeeeeee, 0x222222, 0x666666, 0x888888,
    0x44aa44, 0xdd6633, 0x336688, 0x553322, 0xccbb44, 0x993366,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
