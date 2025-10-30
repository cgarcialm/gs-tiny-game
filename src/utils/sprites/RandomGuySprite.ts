import Phaser from "phaser";
import { createDrawPixel } from "./spriteUtils";

/**
 * Creates a pixel art sprite for a random guy
 * Person with striped shirt
 */
export function createRandomGuySprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 2;
  
  // Colors - Ceci's palette
  const SKIN_LIGHT = 0xffe5cc;
  const SKIN_DARK = 0xffd4a3;
  const HAIR_BROWN = 0x5d4037;
  const SHIRT_STRIPE = 0xd84315;  // Orange/brown stripes
  const SHIRT_BASE = 0x3e2723;    // Dark brown base
  const PANTS_BLACK = 0x212121;
  const EYES_BLACK = 0x212121;
  const MOUTH = 0x424242;
  
  const graphics = scene.add.graphics();
  graphics.setBlendMode(Phaser.BlendModes.NORMAL);
  
  const spriteWidth = 18;
  const spriteHeight = 26;
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  const drawPixel = createDrawPixel(graphics, pixelSize, offsetX, offsetY);
  
  const redrawSprite = () => {
    graphics.clear();
    graphics.setBlendMode(Phaser.BlendModes.NORMAL);
    
    // Hair (short)
    drawPixel(4, 0, HAIR_BROWN);
    drawPixel(5, 0, HAIR_BROWN);
    drawPixel(6, 0, HAIR_BROWN);
    drawPixel(7, 0, HAIR_BROWN);
    drawPixel(8, 0, HAIR_BROWN);
    
    drawPixel(3, 1, HAIR_BROWN);
    drawPixel(4, 1, HAIR_BROWN);
    drawPixel(5, 1, HAIR_BROWN);
    drawPixel(6, 1, HAIR_BROWN);
    drawPixel(7, 1, HAIR_BROWN);
    drawPixel(8, 1, HAIR_BROWN);
    drawPixel(9, 1, HAIR_BROWN);
    
    // Forehead
    drawPixel(4, 2, SKIN_LIGHT);
    drawPixel(5, 2, SKIN_LIGHT);
    drawPixel(6, 2, SKIN_LIGHT);
    drawPixel(7, 2, SKIN_LIGHT);
    drawPixel(8, 2, SKIN_LIGHT);
    
    // Face with eyes
    drawPixel(4, 3, SKIN_LIGHT);
    drawPixel(5, 3, EYES_BLACK);
    drawPixel(6, 3, SKIN_DARK);
    drawPixel(7, 3, EYES_BLACK);
    drawPixel(8, 3, SKIN_LIGHT);
    
    // Lower face
    drawPixel(4, 4, SKIN_LIGHT);
    drawPixel(5, 4, SKIN_LIGHT);
    drawPixel(6, 4, MOUTH);
    drawPixel(7, 4, SKIN_LIGHT);
    drawPixel(8, 4, SKIN_LIGHT);
    
    // Neck
    drawPixel(5, 5, SKIN_LIGHT);
    drawPixel(6, 5, SKIN_LIGHT);
    drawPixel(7, 5, SKIN_LIGHT);
    
    // Striped shirt
    drawPixel(4, 6, SHIRT_BASE);
    drawPixel(5, 6, SHIRT_STRIPE);
    drawPixel(6, 6, SHIRT_BASE);
    drawPixel(7, 6, SHIRT_STRIPE);
    drawPixel(8, 6, SHIRT_BASE);
    
    drawPixel(3, 7, SHIRT_BASE);
    drawPixel(4, 7, SHIRT_STRIPE);
    drawPixel(5, 7, SHIRT_BASE);
    drawPixel(6, 7, SHIRT_STRIPE);
    drawPixel(7, 7, SHIRT_BASE);
    drawPixel(8, 7, SHIRT_STRIPE);
    drawPixel(9, 7, SHIRT_BASE);
    
    drawPixel(3, 8, SHIRT_STRIPE);
    drawPixel(4, 8, SHIRT_BASE);
    drawPixel(5, 8, SHIRT_STRIPE);
    drawPixel(6, 8, SHIRT_BASE);
    drawPixel(7, 8, SHIRT_STRIPE);
    drawPixel(8, 8, SHIRT_BASE);
    drawPixel(9, 8, SHIRT_STRIPE);
    
    // Hands
    drawPixel(2, 8, SKIN_LIGHT);
    drawPixel(10, 8, SKIN_LIGHT);
    
    drawPixel(4, 9, SHIRT_BASE);
    drawPixel(5, 9, SHIRT_STRIPE);
    drawPixel(6, 9, SHIRT_BASE);
    drawPixel(7, 9, SHIRT_STRIPE);
    drawPixel(8, 9, SHIRT_BASE);
    
    // Pants
    drawPixel(4, 10, PANTS_BLACK);
    drawPixel(5, 10, PANTS_BLACK);
    drawPixel(6, 10, PANTS_BLACK);
    drawPixel(7, 10, PANTS_BLACK);
    drawPixel(8, 10, PANTS_BLACK);
    
    drawPixel(4, 11, PANTS_BLACK);
    drawPixel(5, 11, PANTS_BLACK);
    drawPixel(6, 11, PANTS_BLACK);
    drawPixel(7, 11, PANTS_BLACK);
    drawPixel(8, 11, PANTS_BLACK);
    
    drawPixel(4, 12, PANTS_BLACK);
    drawPixel(5, 12, PANTS_BLACK);
    drawPixel(7, 12, PANTS_BLACK);
    drawPixel(8, 12, PANTS_BLACK);
    
    drawPixel(4, 13, PANTS_BLACK);
    drawPixel(5, 13, PANTS_BLACK);
    drawPixel(7, 13, PANTS_BLACK);
    drawPixel(8, 13, PANTS_BLACK);
    
    drawPixel(4, 14, PANTS_BLACK);
    drawPixel(5, 14, PANTS_BLACK);
    drawPixel(7, 14, PANTS_BLACK);
    drawPixel(8, 14, PANTS_BLACK);
    
    // Shoes
    drawPixel(3, 15, HAIR_BROWN);
    drawPixel(4, 15, HAIR_BROWN);
    drawPixel(5, 15, HAIR_BROWN);
    drawPixel(7, 15, HAIR_BROWN);
    drawPixel(8, 15, HAIR_BROWN);
  };
  
  redrawSprite();
  
  container.add(graphics);
  graphics.setVisible(true);
  
  return container;
}

