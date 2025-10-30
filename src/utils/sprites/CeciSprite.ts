import Phaser from "phaser";
import { createDrawPixel } from "./spriteUtils";

/**
 * Creates a pixel art sprite for Ceci
 * Based on the Minecraft-style character design
 */
export function createCeciSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 2;
  
  // Colors - lighter skin, long brown hair, white shirt, light blue shorts
  const SKIN_LIGHT = 0xd4a574;
  const SKIN_DARK = 0xc49a6c;
  const HAIR_BROWN = 0x5d4037;
  const SHIRT_WHITE = 0xffffff;
  const SHIRT_SHADOW = 0xe0e0e0;
  const SHORTS_BLUE = 0x5f9ea0;
  const SHORTS_DARK = 0x4682b4;
  const EYES_BLACK = 0x212121;
  const LIPS_PINK = 0xc17b8e;
  const SHOES_BLACK = 0x1a1a1a;
  
  const graphics = scene.add.graphics();
  graphics.setBlendMode(Phaser.BlendModes.NORMAL);
  
  const spriteWidth = 18;
  const spriteHeight = 22; // Shorter like furries
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  const drawPixel = createDrawPixel(graphics, pixelSize, offsetX, offsetY);
  
  const redrawSprite = () => {
    graphics.clear();
    graphics.setBlendMode(Phaser.BlendModes.NORMAL);
    
    // Long brown hair (thinner on top)
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
    
    // Hair extends down sides (long hair - down to shoulders)
    drawPixel(3, 2, HAIR_BROWN);
    drawPixel(9, 2, HAIR_BROWN);
    drawPixel(3, 3, HAIR_BROWN);
    drawPixel(9, 3, HAIR_BROWN);
    drawPixel(3, 4, HAIR_BROWN);
    drawPixel(9, 4, HAIR_BROWN);
    drawPixel(3, 5, HAIR_BROWN);
    drawPixel(9, 5, HAIR_BROWN);
    drawPixel(3, 6, HAIR_BROWN);
    drawPixel(9, 6, HAIR_BROWN);
    
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
    
    // Lower face with pink lips
    drawPixel(4, 4, SKIN_LIGHT);
    drawPixel(5, 4, SKIN_LIGHT);
    drawPixel(6, 4, LIPS_PINK);
    drawPixel(7, 4, SKIN_LIGHT);
    drawPixel(8, 4, SKIN_LIGHT);
    
    // Neck
    drawPixel(5, 5, SKIN_LIGHT);
    drawPixel(6, 5, SKIN_LIGHT);
    drawPixel(7, 5, SKIN_LIGHT);
    
    // White shirt
    drawPixel(4, 6, SHIRT_WHITE);
    drawPixel(5, 6, SHIRT_WHITE);
    drawPixel(6, 6, SHIRT_WHITE);
    drawPixel(7, 6, SHIRT_WHITE);
    drawPixel(8, 6, SHIRT_WHITE);
    
    drawPixel(3, 7, SHIRT_WHITE);
    drawPixel(4, 7, SHIRT_WHITE);
    drawPixel(5, 7, SHIRT_SHADOW);
    drawPixel(6, 7, SHIRT_WHITE);
    drawPixel(7, 7, SHIRT_SHADOW);
    drawPixel(8, 7, SHIRT_WHITE);
    drawPixel(9, 7, SHIRT_WHITE);
    
    drawPixel(3, 8, SHIRT_WHITE);
    drawPixel(4, 8, SHIRT_SHADOW);
    drawPixel(5, 8, SHIRT_WHITE);
    drawPixel(6, 8, SHIRT_WHITE);
    drawPixel(7, 8, SHIRT_WHITE);
    drawPixel(8, 8, SHIRT_SHADOW);
    drawPixel(9, 8, SHIRT_WHITE);
    
    // Hands
    drawPixel(2, 8, SKIN_LIGHT);
    drawPixel(10, 8, SKIN_LIGHT);
    
    drawPixel(4, 9, SHIRT_WHITE);
    drawPixel(5, 9, SHIRT_WHITE);
    drawPixel(6, 9, SHIRT_WHITE);
    drawPixel(7, 9, SHIRT_WHITE);
    drawPixel(8, 9, SHIRT_WHITE);
    
    // Light blue shorts
    drawPixel(4, 10, SHORTS_BLUE);
    drawPixel(5, 10, SHORTS_BLUE);
    drawPixel(6, 10, SHORTS_BLUE);
    drawPixel(7, 10, SHORTS_BLUE);
    drawPixel(8, 10, SHORTS_BLUE);
    
    drawPixel(4, 11, SHORTS_DARK);
    drawPixel(5, 11, SHORTS_BLUE);
    drawPixel(6, 11, SHORTS_BLUE);
    drawPixel(7, 11, SHORTS_BLUE);
    drawPixel(8, 11, SHORTS_DARK);
    
    // Legs (bare - shorts)
    drawPixel(4, 12, SKIN_LIGHT);
    drawPixel(5, 12, SKIN_LIGHT);
    drawPixel(7, 12, SKIN_LIGHT);
    drawPixel(8, 12, SKIN_LIGHT);
    
    // Black shoes
    drawPixel(4, 13, SHOES_BLACK);
    drawPixel(5, 13, SHOES_BLACK);
    drawPixel(7, 13, SHOES_BLACK);
    drawPixel(8, 13, SHOES_BLACK);
  };
  
  redrawSprite();
  
  container.add(graphics);
  graphics.setVisible(true);
  
  return container;
}
