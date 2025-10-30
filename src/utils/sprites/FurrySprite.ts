import Phaser from "phaser";
import { createDrawPixel } from "./spriteUtils";

/**
 * Creates a pixel art sprite for a convention-goer with furry tail
 * Regular person in colorful clothes with a tail attached
 */
export function createFurrySprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  shirtColor: number,
  tailColor: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 2;
  
  // Colors
  const SHIRT_COLOR = shirtColor;      // Colorful shirt
  const TAIL_COLOR = tailColor;        // Brown or white tail
  const SKIN_LIGHT = 0xffe5cc;
  const SKIN_DARK = 0xffd4a3;
  const HAIR_BROWN = 0x5d4037;
  const PANTS_DARK = 0x424242;
  const EYES_BLACK = 0x212121;
  const MOUTH = 0x8d6e63;
  
  const graphics = scene.add.graphics();
  graphics.setBlendMode(Phaser.BlendModes.NORMAL);
  
  const spriteWidth = 20; // Wider for tail
  const spriteHeight = 22; // Shorter character
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  const drawPixel = createDrawPixel(graphics, pixelSize, offsetX, offsetY);
  
  const redrawSprite = () => {
    graphics.clear();
    graphics.setBlendMode(Phaser.BlendModes.NORMAL);
    
    // Furry ears on headband
    drawPixel(3, 0, TAIL_COLOR);
    drawPixel(4, 0, TAIL_COLOR);
    drawPixel(7, 0, TAIL_COLOR);
    drawPixel(8, 0, TAIL_COLOR);
    
    // Hair
    drawPixel(4, 1, HAIR_BROWN);
    drawPixel(5, 1, HAIR_BROWN);
    drawPixel(6, 1, HAIR_BROWN);
    drawPixel(7, 1, HAIR_BROWN);
    
    // Face
    drawPixel(4, 2, SKIN_LIGHT);
    drawPixel(5, 2, SKIN_LIGHT);
    drawPixel(6, 2, SKIN_LIGHT);
    drawPixel(7, 2, SKIN_LIGHT);
    
    drawPixel(4, 3, SKIN_LIGHT);
    drawPixel(5, 3, EYES_BLACK);
    drawPixel(6, 3, SKIN_DARK);
    drawPixel(7, 3, EYES_BLACK);
    
    drawPixel(5, 4, SKIN_LIGHT);
    drawPixel(6, 4, MOUTH);
    drawPixel(7, 4, SKIN_LIGHT);
    
    drawPixel(5, 5, SKIN_LIGHT);
    drawPixel(6, 5, SKIN_LIGHT);
    
    // Colorful shirt
    drawPixel(4, 6, SHIRT_COLOR);
    drawPixel(5, 6, SHIRT_COLOR);
    drawPixel(6, 6, SHIRT_COLOR);
    drawPixel(7, 6, SHIRT_COLOR);
    
    drawPixel(3, 7, SHIRT_COLOR);
    drawPixel(4, 7, SHIRT_COLOR);
    drawPixel(5, 7, SHIRT_COLOR);
    drawPixel(6, 7, SHIRT_COLOR);
    drawPixel(7, 7, SHIRT_COLOR);
    drawPixel(8, 7, SHIRT_COLOR);
    
    drawPixel(3, 8, SHIRT_COLOR);
    drawPixel(4, 8, SHIRT_COLOR);
    drawPixel(5, 8, SHIRT_COLOR);
    drawPixel(6, 8, SHIRT_COLOR);
    drawPixel(7, 8, SHIRT_COLOR);
    drawPixel(8, 8, SHIRT_COLOR);
    
    // Hands
    drawPixel(2, 8, SKIN_LIGHT);
    drawPixel(9, 8, SKIN_LIGHT);
    
    drawPixel(4, 9, SHIRT_COLOR);
    drawPixel(5, 9, SHIRT_COLOR);
    drawPixel(6, 9, SHIRT_COLOR);
    drawPixel(7, 9, SHIRT_COLOR);
    
    // Dark pants
    drawPixel(4, 10, PANTS_DARK);
    drawPixel(5, 10, PANTS_DARK);
    drawPixel(6, 10, PANTS_DARK);
    drawPixel(7, 10, PANTS_DARK);
    
    drawPixel(4, 11, PANTS_DARK);
    drawPixel(5, 11, PANTS_DARK);
    drawPixel(6, 11, PANTS_DARK);
    drawPixel(7, 11, PANTS_DARK);
    
    drawPixel(4, 12, PANTS_DARK);
    drawPixel(5, 12, PANTS_DARK);
    drawPixel(6, 12, PANTS_DARK);
    drawPixel(7, 12, PANTS_DARK);
    
    // Shoes
    drawPixel(4, 13, HAIR_BROWN);
    drawPixel(5, 13, HAIR_BROWN);
    drawPixel(6, 13, HAIR_BROWN);
    drawPixel(7, 13, HAIR_BROWN);
    
    // FOX TAIL - fluffy, curved, wavy shape
    // Base of tail (attached to body)
    drawPixel(8, 9, TAIL_COLOR);
    drawPixel(9, 9, TAIL_COLOR);
    
    // Middle section - curves outward
    drawPixel(9, 10, TAIL_COLOR);
    drawPixel(10, 10, TAIL_COLOR);
    drawPixel(11, 10, TAIL_COLOR);
    
    // Curve continues
    drawPixel(11, 11, TAIL_COLOR);
    drawPixel(12, 11, TAIL_COLOR);
    drawPixel(13, 11, TAIL_COLOR);
    
    // Tail tip - curves back slightly and gets fluffy
    drawPixel(13, 10, TAIL_COLOR);
    drawPixel(14, 10, TAIL_COLOR);
    drawPixel(14, 9, TAIL_COLOR);
    drawPixel(15, 9, TAIL_COLOR);
    
    // Add white/light tip for fox tail effect
    const TIP_COLOR = tailColor === 0x8b4513 ? 0xffffff : 0xeeeeee;
    drawPixel(15, 10, TIP_COLOR);
    drawPixel(16, 9, TIP_COLOR);
  };
  
  redrawSprite();
  
  container.add(graphics);
  graphics.setVisible(true);
  
  return container;
}

