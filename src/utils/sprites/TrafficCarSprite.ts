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
  g.fillEllipse(1, 13, 18, 5);

  // Left front wheel (behind body)
  g.fillStyle(BLACK, 1);
  g.fillRect(-13, -13, 4, 10);

  // Left side of hood (above wheel)
  g.fillStyle(dark, 1);
  g.fillRect(-10, -18, 3, 5);

  // Main body
  g.fillStyle(color, 1);
  g.fillRect(-7, -10, 13, 23);

  // Left side
  g.fillStyle(dark, 1);
  g.fillRect(-10, -10, 4, 23);

  // Roof
  g.fillStyle(dark, 1);
  g.fillRect(-8, -16, 14, 5);

  // Hood
  g.fillStyle(color, 1);
  g.fillRect(-7, -18, 12, 4);

  // Front windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-5, -14, 10, 4);

  // Left side window
  g.fillStyle(WINDOW, 1);
  g.fillRect(-9, -12, 3, 16);

  // Rear windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-4, -1, 8, 5);

  // Body highlight
  g.fillStyle(light, 1);
  g.fillRect(-4, -8, 8, 16);

  // Tail lights
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-5, 9, 4, 3);
  g.fillRect(3, 9, 4, 3);

  // Left rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-13, 3, 4, 10);

  // Right rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(7, 5, 3, 7);
}

function drawSUV(g: Phaser.GameObjects.Graphics, color: number, dark: number, light: number) {
  const WINDOW = 0x203848;
  const TAIL_LIGHT = 0xff3333;
  const BLACK = 0x111111;

  // Shadow
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(1, 16, 21, 6);

  // Left front wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-14, -16, 4, 12);

  // Left side of hood
  g.fillStyle(dark, 1);
  g.fillRect(-12, -21, 3, 5);

  // Main body
  g.fillStyle(color, 1);
  g.fillRect(-8, -13, 16, 29);

  // Left side
  g.fillStyle(dark, 1);
  g.fillRect(-12, -13, 4, 29);

  // Roof
  g.fillStyle(dark, 1);
  g.fillRect(-9, -18, 17, 5);

  // Hood
  g.fillStyle(color, 1);
  g.fillRect(-8, -21, 14, 4);

  // Front windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-7, -17, 13, 4);

  // Left side windows
  g.fillStyle(WINDOW, 1);
  g.fillRect(-10, -14, 3, 21);

  // Rear windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-5, -1, 10, 7);

  // Roof rail
  g.fillStyle(0x444444, 1);
  g.fillRect(-8, -13, 3, 8);

  // Body highlight
  g.fillStyle(light, 1);
  g.fillRect(-5, -10, 10, 21);

  // Tail lights
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-7, 12, 4, 3);
  g.fillRect(4, 12, 4, 3);

  // Left rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-14, 4, 4, 12);

  // Right rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(8, 7, 3, 8);
}

function drawCompact(g: Phaser.GameObjects.Graphics, color: number, dark: number, light: number) {
  const WINDOW = 0x203848;
  const TAIL_LIGHT = 0xff3333;
  const BLACK = 0x111111;

  // Shadow
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(1, 10, 16, 4);

  // Left front wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-9, -10, 3, 8);

  // Left side of hood
  g.fillStyle(dark, 1);
  g.fillRect(-8, -14, 3, 4);

  // Main body
  g.fillStyle(color, 1);
  g.fillRect(-5, -8, 10, 18);

  // Left side
  g.fillStyle(dark, 1);
  g.fillRect(-8, -8, 3, 18);

  // Roof
  g.fillStyle(dark, 1);
  g.fillRect(-7, -12, 12, 4);

  // Hood
  g.fillStyle(color, 1);
  g.fillRect(-5, -14, 9, 4);

  // Front windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-4, -10, 8, 3);

  // Left side window
  g.fillStyle(WINDOW, 1);
  g.fillRect(-7, -9, 3, 12);

  // Rear windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-3, 0, 7, 4);

  // Body highlight
  g.fillStyle(light, 1);
  g.fillRect(-3, -5, 7, 12);

  // Tail lights
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-4, 7, 3, 3);
  g.fillRect(3, 7, 3, 3);

  // Left rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-9, 3, 3, 8);

  // Right rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(5, 4, 3, 5);
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
