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
  g.fillEllipse(1, 10, 14, 4);

  // Left front wheel (behind body)
  g.fillStyle(BLACK, 1);
  g.fillRect(-10, -10, 3, 8);

  // Left side of hood (above wheel)
  g.fillStyle(dark, 1);
  g.fillRect(-8, -14, 2, 4);

  // Main body
  g.fillStyle(color, 1);
  g.fillRect(-5, -8, 10, 18);

  // Left side
  g.fillStyle(dark, 1);
  g.fillRect(-8, -8, 3, 18);

  // Roof
  g.fillStyle(dark, 1);
  g.fillRect(-6, -12, 11, 4);

  // Hood
  g.fillStyle(color, 1);
  g.fillRect(-5, -14, 9, 3);

  // Front windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-4, -11, 8, 3);

  // Left side window
  g.fillStyle(WINDOW, 1);
  g.fillRect(-7, -9, 2, 12);

  // Rear windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-3, -1, 6, 4);

  // Body highlight
  g.fillStyle(light, 1);
  g.fillRect(-3, -6, 6, 12);

  // Tail lights
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-4, 7, 3, 2);
  g.fillRect(2, 7, 3, 2);

  // Left rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-10, 2, 3, 8);

  // Right rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(5, 4, 2, 5);
}

function drawSUV(g: Phaser.GameObjects.Graphics, color: number, dark: number, light: number) {
  const WINDOW = 0x203848;
  const TAIL_LIGHT = 0xff3333;
  const BLACK = 0x111111;

  // Shadow
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(1, 12, 16, 5);

  // Left front wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-11, -12, 3, 9);

  // Left side of hood
  g.fillStyle(dark, 1);
  g.fillRect(-9, -16, 2, 4);

  // Main body
  g.fillStyle(color, 1);
  g.fillRect(-6, -10, 12, 22);

  // Left side
  g.fillStyle(dark, 1);
  g.fillRect(-9, -10, 3, 22);

  // Roof
  g.fillStyle(dark, 1);
  g.fillRect(-7, -14, 13, 4);

  // Hood
  g.fillStyle(color, 1);
  g.fillRect(-6, -16, 11, 3);

  // Front windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-5, -13, 10, 3);

  // Left side windows
  g.fillStyle(WINDOW, 1);
  g.fillRect(-8, -11, 2, 16);

  // Rear windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-4, -1, 8, 5);

  // Roof rail
  g.fillStyle(0x444444, 1);
  g.fillRect(-6, -10, 2, 6);

  // Body highlight
  g.fillStyle(light, 1);
  g.fillRect(-4, -8, 8, 16);

  // Tail lights
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-5, 9, 3, 2);
  g.fillRect(3, 9, 3, 2);

  // Left rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-11, 3, 3, 9);

  // Right rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(6, 5, 2, 6);
}

function drawCompact(g: Phaser.GameObjects.Graphics, color: number, dark: number, light: number) {
  const WINDOW = 0x203848;
  const TAIL_LIGHT = 0xff3333;
  const BLACK = 0x111111;

  // Shadow
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(1, 8, 12, 3);

  // Left front wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-7, -8, 2, 6);

  // Left side of hood
  g.fillStyle(dark, 1);
  g.fillRect(-6, -11, 2, 3);

  // Main body
  g.fillStyle(color, 1);
  g.fillRect(-4, -6, 8, 14);

  // Left side
  g.fillStyle(dark, 1);
  g.fillRect(-6, -6, 2, 14);

  // Roof
  g.fillStyle(dark, 1);
  g.fillRect(-5, -9, 9, 3);

  // Hood
  g.fillStyle(color, 1);
  g.fillRect(-4, -11, 7, 3);

  // Front windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-3, -8, 6, 2);

  // Left side window
  g.fillStyle(WINDOW, 1);
  g.fillRect(-5, -7, 2, 9);

  // Rear windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-2, 0, 5, 3);

  // Body highlight
  g.fillStyle(light, 1);
  g.fillRect(-2, -4, 5, 9);

  // Tail lights
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-3, 5, 2, 2);
  g.fillRect(2, 5, 2, 2);

  // Left rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-7, 2, 2, 6);

  // Right rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(4, 3, 2, 4);
}

function drawPickup(g: Phaser.GameObjects.Graphics, color: number, dark: number, light: number) {
  const WINDOW = 0x203848;
  const TAIL_LIGHT = 0xff3333;
  const BLACK = 0x111111;

  // Shadow
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(1, 11, 14, 4);

  // Left front wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-10, -9, 3, 7);

  // Left side of hood
  g.fillStyle(dark, 1);
  g.fillRect(-8, -12, 2, 3);

  // Cab
  g.fillStyle(color, 1);
  g.fillRect(-5, -10, 10, 10);

  // Cab left side
  g.fillStyle(dark, 1);
  g.fillRect(-8, -10, 3, 10);

  // Bed
  g.fillStyle(color, 1);
  g.fillRect(-5, 0, 10, 10);

  // Bed left wall
  g.fillStyle(dark, 1);
  g.fillRect(-8, 0, 3, 10);

  // Bed interior
  g.fillStyle(0x1a1a1a, 1);
  g.fillRect(-4, 1, 7, 6);

  // Hood
  g.fillStyle(color, 1);
  g.fillRect(-4, -12, 8, 3);

  // Front windshield
  g.fillStyle(WINDOW, 1);
  g.fillRect(-3, -9, 7, 3);

  // Left cab window
  g.fillStyle(WINDOW, 1);
  g.fillRect(-7, -8, 2, 7);

  // Rear cab window
  g.fillStyle(WINDOW, 1);
  g.fillRect(-3, -4, 6, 3);

  // Cab highlight
  g.fillStyle(light, 1);
  g.fillRect(-3, -8, 6, 6);

  // Tail lights
  g.fillStyle(TAIL_LIGHT, 1);
  g.fillRect(-4, 8, 3, 2);
  g.fillRect(2, 8, 3, 2);

  // Left rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(-10, 3, 3, 7);

  // Right rear wheel
  g.fillStyle(BLACK, 1);
  g.fillRect(5, 4, 2, 5);
}

export function getRandomCarColor(): number {
  const colors = [
    0x2244aa, 0xaa2222, 0xeeeeee, 0x222222, 0x666666, 0x888888,
    0x44aa44, 0xdd6633, 0x336688, 0x553322, 0xccbb44, 0x993366,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
