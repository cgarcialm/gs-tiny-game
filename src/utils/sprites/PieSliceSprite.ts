import Phaser from "phaser";
import { createDrawPixel } from "./spriteUtils";

/**
 * Creates a small pie slice sprite (strawberry rhubarb)
 * Minimal pixel art version
 */
export function createPieSliceSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  const pixelSize = 2;
  
  // Colors (brighter)
  const CRUST_YELLOW = 0xffd700; // Bright yellow crust
  const FILLING_RED = 0xff0000; // Bright red strawberry
  const CRUST_OUTLINE = 0xdaa520; // Golden outline
  
  const spriteWidth = 5;
  const spriteHeight = 4;
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  const drawPixel = createDrawPixel(graphics, pixelSize, offsetX, offsetY);
  
  graphics.setPosition(x, y);
  
  // Pie slice 
  // Middle (filling shows)
  drawPixel(1, 2, FILLING_RED);
  drawPixel(2, 1, FILLING_RED);
  drawPixel(2, 2, FILLING_RED);
  
  // Right side expanding
  drawPixel(0, 2, CRUST_OUTLINE);
  drawPixel(1, 1, CRUST_OUTLINE);
  drawPixel(2, 0, CRUST_OUTLINE);
  drawPixel(3, 0, CRUST_OUTLINE);
  
  // Point (right edge)
  drawPixel(3, 1, CRUST_YELLOW);
  drawPixel(3, 2, CRUST_YELLOW);
  
  return graphics;
}

