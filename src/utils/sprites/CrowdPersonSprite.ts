import Phaser from "phaser";

interface CrowdPersonColors {
  hair: number;
  shirt: number;
  pants: number;
  skin?: number;
}

/**
 * Creates a simple crowd person sprite with customizable colors
 * Returns a container with the person sprite
 */
export function createCrowdPersonSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  colors: CrowdPersonColors
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const graphics = scene.add.graphics();

  const skinColor = colors.skin || 0xffdbac; // Default skin tone

  // Draw from top to bottom - bigger to be more visible and match other characters

  // Hair (top of head)
  graphics.fillStyle(colors.hair, 1);
  graphics.fillRect(-4, -9, 8, 3); // Hair

  // Head (skin)
  graphics.fillStyle(skinColor, 1);
  graphics.fillRect(-4, -6, 8, 5); // Head/face

  // Shirt/torso
  graphics.fillStyle(colors.shirt, 1);
  graphics.fillRect(-4, -1, 8, 6); // Torso

  // Pants/legs
  graphics.fillStyle(colors.pants, 1);
  graphics.fillRect(-4, 5, 4, 5); // Left leg
  graphics.fillRect(0, 5, 4, 5);  // Right leg

  container.add(graphics);
  return container;
}

/**
 * Get random colors for a crowd person
 */
export function getRandomCrowdColors(): CrowdPersonColors {
  const hairColors = [
    0x000000, // Black
    0x8B4513, // Brown
    0xFFD700, // Blonde
    0xFF6347, // Red
    0x696969, // Gray
    0x4a4a4a, // Dark gray
  ];

  const shirtColors = [
    0x4a90e2, // Blue
    0xe24a4a, // Red
    0x4ae24a, // Green
    0xe2e24a, // Yellow
    0xe24ae2, // Magenta
    0x4ae2e2, // Cyan
    0xff9800, // Orange
    0x9c27b0, // Purple
    0x00bcd4, // Teal
  ];

  const pantsColors = [
    0x2c3e50, // Dark blue
    0x34495e, // Slate
    0x1a1a1a, // Black
    0x4a4a4a, // Gray
    0x5d4037, // Brown
    0x1976d2, // Blue jeans
  ];

  const skinTones = [
    0xffdbac, // Light
    0xf1c27d, // Medium light
    0xe0ac69, // Medium
    0xc68642, // Medium dark
    0x8d5524, // Dark
  ];

  return {
    hair: hairColors[Math.floor(Math.random() * hairColors.length)],
    shirt: shirtColors[Math.floor(Math.random() * shirtColors.length)],
    pants: pantsColors[Math.floor(Math.random() * pantsColors.length)],
    skin: skinTones[Math.floor(Math.random() * skinTones.length)],
  };
}

