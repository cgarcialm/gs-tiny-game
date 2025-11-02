import Phaser from "phaser";
import { createDrawPixel } from "./spriteUtils";

/**
 * Simple shopper sprite for farmers market
 * Small person that walks across aisles
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
    { head: 0xffe5cc, shirt: 0xff6b9d, pants: 0x4a5568 }, // Pink shirt
    { head: 0xffd7b5, shirt: 0x9333ea, pants: 0x3b82f6 }, // Purple shirt
    { head: 0xf5c6a5, shirt: 0xfbbf24, pants: 0x059669 }, // Yellow shirt
  ];
  
  const color = colors[colorIndex % colors.length];
  
  const spriteWidth = 6;
  const spriteHeight = 6; // Shorter!
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  const drawPixel = createDrawPixel(graphics, pixelSize, offsetX, offsetY);
  
  // Draw simple shopper (shorter)
  // Head
  drawPixel(2, 0, color.head);
  drawPixel(3, 0, color.head);
  
  drawPixel(2, 1, color.head);
  drawPixel(3, 1, color.head);
  
  // Shirt
  drawPixel(2, 2, color.shirt);
  drawPixel(3, 2, color.shirt);
  
  drawPixel(2, 3, color.shirt);
  drawPixel(3, 3, color.shirt);
  
  // Pants
  drawPixel(2, 4, color.pants);
  drawPixel(3, 4, color.pants);
  
  drawPixel(2, 5, color.pants);
  drawPixel(3, 5, color.pants);
  
  container.add(graphics);
  
  return container;
}

