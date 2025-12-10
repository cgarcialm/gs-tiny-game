import Phaser from "phaser";

/**
 * Creates a side-view burgundy 90s minivan sprite
 * Pixel art style like a Dodge Caravan
 */
export function createVanSideSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();

  // Colors matching the pixel art reference
  const BURGUNDY = 0x6b2020;       // Main body
  const BURGUNDY_DARK = 0x4a1515;  // Shadows/accents
  // const BURGUNDY_LIGHT = 0x8b3030; // Highlights (unused)
  const WINDOW = 0x4a7a7a;         // Teal-ish windows
  const BLACK = 0x1a1a1a;          // Outlines, wheel wells
  const WHEEL_DARK = 0x2a2a2a;     // Tire
  const WHEEL_HUB = 0x888888;      // Hubcap
  const ORANGE = 0xdd6600;         // Lights

  const p = 3; // pixel size

  // Main body block - extended up to roof
  g.fillStyle(BURGUNDY, 1);
  g.fillRect(-14*p, -11*p, 24*p, 13*p);

  g.fillStyle(BURGUNDY, 1);
  g.fillRect(10*p, -5*p, 8*p, 7*p);

  // Back section (stepped)
  g.fillStyle(BURGUNDY, 1);
  g.fillRect(-16*p, -9*p, 2*p, 11*p);

  // Roof (darker) - slopes down at front to meet windshield
  g.fillStyle(BURGUNDY_DARK, 1);
  g.fillRect(-14*p, -12*p, 22*p, 2*p);
  // Roof slope at front
  g.beginPath();
  g.moveTo(8*p, -12*p);   // End of flat roof
  g.lineTo(8*p, -10*p);   // Down
  g.lineTo(16*p, -4*p);   // Slope to windshield top
  g.lineTo(16*p, -6*p);   // Slope to windshield top
  g.closePath();
  g.fill();

  // Body shadow lines (horizontal)
  g.fillStyle(BURGUNDY_DARK, 1);
  g.fillRect(-14*p, -3*p, 30*p, p);
  g.fillRect(-16*p, -2*p, 2*p, p);

  // All windows same size: 8p wide, 5p tall
  const winW = 8*p;
  const winH = 5*p;

  // Front windshield (angled - at the front)
  g.fillStyle(WINDOW, 1);
  g.beginPath();
  g.moveTo(8*p, -10*p);
  g.lineTo(15*p, -6*p);
  g.lineTo(15*p, -5*p);
  g.lineTo(8*p, -5*p);
  g.closePath();
  g.fill();

  // Driver side window (middle)
  g.fillStyle(WINDOW, 1);
  g.fillRect(-2*p, -10*p, winW, winH);

  // Rear side window (back)
  g.fillStyle(WINDOW, 1);
  g.fillRect(-12*p, -10*p, winW, winH);

  // Window borders / pillars (black)
  g.fillStyle(BLACK, 1);
  g.fillRect(7*p, -10*p, p, 6*p);    // A-pillar (between windshield and driver)
  g.fillRect(-3*p, -10*p, p, 6*p);   // B-pillar (between driver and rear)
  g.fillRect(-13*p, -10*p, p, 6*p);  // C-pillar (back of rear window)

  // Bottom black trim / wheel wells
  g.fillStyle(BLACK, 1);
  g.fillRect(-16*p, 2*p, 34*p, 2*p);

  // Wheel wells (arched)
  g.fillStyle(BLACK, 1);
  g.fillRect(-12*p, 0, 6*p, 2*p);
  g.fillRect(7*p, 0, 6*p, 2*p);

  // Front wheel
  g.fillStyle(WHEEL_DARK, 1);
  g.fillCircle(10*p, 3*p, 3*p);
  g.fillStyle(WHEEL_HUB, 1);
  g.fillCircle(10*p, 3*p, 1.5*p);

  // Rear wheel
  g.fillStyle(WHEEL_DARK, 1);
  g.fillCircle(-9*p, 3*p, 3*p);
  g.fillStyle(WHEEL_HUB, 1);
  g.fillCircle(-9*p, 3*p, 1.5*p);

  // Tail light (orange/amber)
  g.fillStyle(ORANGE, 1);
  g.fillRect(-16*p, -4*p, p, 2*p);

  // Headlight (orange/amber)
  g.fillStyle(ORANGE, 1);
  g.fillRect(17*p, -3*p, p, 2*p);

  // Door handles (below back border of each window)
  g.fillStyle(BLACK, 1);
  g.fillRect(5*p, -4*p, 2*p, p);    // Front door handle (below driver window back)
  g.fillRect(-5*p, -4*p, 2*p, p);   // Middle door handle (below rear window back)

  container.add(g);
  
  return container;
}


