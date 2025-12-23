import Phaser from "phaser";
import { createDrawPixel } from "./spriteUtils";

/**
 * Improved shopper sprite for farmers market
 * Small person with arms that walks across aisles
 */
export function createShopperSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  colorIndex: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 2;
  const graphics = scene.add.graphics();
  
  // Different shopper colors for variety
  const colors = [
    { head: 0xffe5cc, hair: 0x8b4513, shirt: 0xff6b9d, pants: 0x4a5568 }, // Pink shirt, brown hair
    { head: 0xffd7b5, hair: 0x2d1b0e, shirt: 0x9333ea, pants: 0x3b82f6 }, // Purple shirt, dark hair
    { head: 0xf5c6a5, hair: 0xffd700, shirt: 0xfbbf24, pants: 0x059669 }, // Yellow shirt, blonde
    { head: 0xd4a574, hair: 0x1a1a1a, shirt: 0x22c55e, pants: 0x1e40af }, // Green shirt, black hair
    { head: 0xffe5cc, hair: 0xc04000, shirt: 0x3b82f6, pants: 0x374151 }, // Blue shirt, red hair
  ];
  
  const color = colors[colorIndex % colors.length];
  
  const spriteWidth = 7;
  const spriteHeight = 8;
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  // Draw function that handles animation frames
  const redraw = (frame: number) => {
    graphics.clear();
    const drawPixel = createDrawPixel(graphics, pixelSize, offsetX, offsetY);
    
    // Animation: arms swing based on frame
    const walkCycle = Math.floor(frame) % 4;
    const armSwing = walkCycle < 2 ? 0 : 1; // Alternate arm positions
    
    // Hair (top of head)
    drawPixel(2, 0, color.hair);
    drawPixel(3, 0, color.hair);
    drawPixel(4, 0, color.hair);
    
    // Head (3 pixels wide)
    drawPixel(2, 1, color.head);
    drawPixel(3, 1, color.head);
    drawPixel(4, 1, color.head);
    
    drawPixel(2, 2, color.head);
    drawPixel(3, 2, color.head);
    drawPixel(4, 2, color.head);
    
    // Body/shirt (3 pixels wide)
    drawPixel(2, 3, color.shirt);
    drawPixel(3, 3, color.shirt);
    drawPixel(4, 3, color.shirt);
    
    drawPixel(2, 4, color.shirt);
    drawPixel(3, 4, color.shirt);
    drawPixel(4, 4, color.shirt);
    
    // Arms (swing animation)
    if (armSwing === 0) {
      // Left arm down, right arm up
      drawPixel(1, 4, color.shirt); // Left arm down
      drawPixel(5, 3, color.shirt); // Right arm up
    } else {
      // Left arm up, right arm down
      drawPixel(1, 3, color.shirt); // Left arm up
      drawPixel(5, 4, color.shirt); // Right arm down
    }
    
    // Pants (2 pixels wide, with leg animation)
    if (walkCycle === 0 || walkCycle === 2) {
      // Legs together
      drawPixel(2, 5, color.pants);
      drawPixel(3, 5, color.pants);
      drawPixel(4, 5, color.pants);
      drawPixel(2, 6, color.pants);
      drawPixel(4, 6, color.pants);
    } else if (walkCycle === 1) {
      // Left leg forward
      drawPixel(2, 5, color.pants);
      drawPixel(3, 5, color.pants);
      drawPixel(4, 5, color.pants);
      drawPixel(1, 6, color.pants); // Left leg forward
      drawPixel(4, 6, color.pants);
    } else {
      // Right leg forward
      drawPixel(2, 5, color.pants);
      drawPixel(3, 5, color.pants);
      drawPixel(4, 5, color.pants);
      drawPixel(2, 6, color.pants);
      drawPixel(5, 6, color.pants); // Right leg forward
    }
    
    // Feet
    if (walkCycle === 1) {
      drawPixel(1, 7, 0x1a1a1a); // Left foot forward
      drawPixel(4, 7, 0x1a1a1a);
    } else if (walkCycle === 3) {
      drawPixel(2, 7, 0x1a1a1a);
      drawPixel(5, 7, 0x1a1a1a); // Right foot forward
    } else {
      drawPixel(2, 7, 0x1a1a1a);
      drawPixel(4, 7, 0x1a1a1a);
    }
  };
  
  // Initial draw (idle)
  redraw(0);
  
  container.add(graphics);
  container.setData("redraw", redraw);
  container.setData("walkFrame", 0);
  
  return container;
}

/**
 * Update shopper walk animation
 */
export function updateShopperWalk(
  sprite: Phaser.GameObjects.Container,
  isMoving: boolean
) {
  const redrawFunc = sprite.getData("redraw");
  if (!redrawFunc) return;
  
  if (isMoving) {
    let frame = sprite.getData("walkFrame") || 0;
    frame += 0.15; // Slower animation speed for casual walking
    sprite.setData("walkFrame", frame);
    redrawFunc(frame);
  } else {
    sprite.setData("walkFrame", 0);
    redrawFunc(0);
  }
}
