import Phaser from "phaser";
import { createDrawPixel } from "./spriteUtils";

/**
 * Creates a pixel art sprite for a Security Guard
 * Transit security officer
 */
export function createSecurityGuardSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 2;
  
  // Colors - Security uniform
  const UNIFORM_DARK = 0x001f2e;   // Very dark blue uniform
  const UNIFORM_MED = 0x003d5c;    // Medium dark blue
  const VEST_GREEN = 0x00ff00;     // Bright green safety vest
  const VEST_STRIPE = 0xffff00;    // Yellow reflective stripe
  const SKIN_LIGHT = 0xc49a6c;     // Darker skin tone
  const SKIN_DARK = 0xa67c52;      // Darker shading
  const HAT_BLACK = 0x000000;
  const BADGE_GOLD = 0xffd700;
  const EYES_BLACK = 0x212121;
  
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
    
    // Hat
    drawPixel(4, 0, HAT_BLACK);
    drawPixel(5, 0, HAT_BLACK);
    drawPixel(6, 0, HAT_BLACK);
    drawPixel(7, 0, HAT_BLACK);
    drawPixel(8, 0, HAT_BLACK);
    
    drawPixel(3, 1, HAT_BLACK);
    drawPixel(4, 1, HAT_BLACK);
    drawPixel(5, 1, HAT_BLACK);
    drawPixel(6, 1, HAT_BLACK);
    drawPixel(7, 1, HAT_BLACK);
    drawPixel(8, 1, HAT_BLACK);
    drawPixel(9, 1, HAT_BLACK);
    
    // Hat brim
    drawPixel(2, 2, HAT_BLACK);
    drawPixel(3, 2, HAT_BLACK);
    drawPixel(4, 2, HAT_BLACK);
    drawPixel(5, 2, HAT_BLACK);
    drawPixel(6, 2, HAT_BLACK);
    drawPixel(7, 2, HAT_BLACK);
    drawPixel(8, 2, HAT_BLACK);
    drawPixel(9, 2, HAT_BLACK);
    drawPixel(10, 2, HAT_BLACK);
    
    // Face
    drawPixel(4, 3, SKIN_LIGHT);
    drawPixel(5, 3, SKIN_LIGHT);
    drawPixel(6, 3, SKIN_LIGHT);
    drawPixel(7, 3, SKIN_LIGHT);
    drawPixel(8, 3, SKIN_LIGHT);
    
    // Eyes
    drawPixel(4, 4, SKIN_LIGHT);
    drawPixel(5, 4, EYES_BLACK);
    drawPixel(6, 4, SKIN_DARK);
    drawPixel(7, 4, EYES_BLACK);
    drawPixel(8, 4, SKIN_LIGHT);
    
    // Lower face
    drawPixel(5, 5, SKIN_LIGHT);
    drawPixel(6, 5, SKIN_LIGHT);
    drawPixel(7, 5, SKIN_LIGHT);
    
    // Neck
    drawPixel(5, 6, SKIN_LIGHT);
    drawPixel(6, 6, SKIN_LIGHT);
    drawPixel(7, 6, SKIN_LIGHT);
    
    // Dark blue shirt under vest
    drawPixel(4, 7, UNIFORM_MED);
    drawPixel(5, 7, UNIFORM_MED);
    drawPixel(6, 7, UNIFORM_MED);
    drawPixel(7, 7, UNIFORM_MED);
    drawPixel(8, 7, UNIFORM_MED);
    
    // Bright green safety vest (no sleeves - arms showing)
    drawPixel(3, 8, UNIFORM_DARK);   // Dark blue arm
    drawPixel(4, 8, VEST_GREEN);
    drawPixel(5, 8, VEST_STRIPE);   // Yellow reflective stripe
    drawPixel(6, 8, VEST_STRIPE);
    drawPixel(7, 8, VEST_STRIPE);
    drawPixel(8, 8, VEST_GREEN);
    drawPixel(9, 8, UNIFORM_DARK);   // Dark blue arm
    
    // Badge on vest
    drawPixel(6, 7, BADGE_GOLD);
    
    drawPixel(3, 9, UNIFORM_DARK);   // Dark blue arm
    drawPixel(4, 9, VEST_GREEN);
    drawPixel(5, 9, VEST_GREEN);
    drawPixel(6, 9, VEST_GREEN);
    drawPixel(7, 9, VEST_GREEN);
    drawPixel(8, 9, VEST_GREEN);
    drawPixel(9, 9, UNIFORM_DARK);   // Dark blue arm
    
    // Hands
    drawPixel(2, 9, SKIN_LIGHT);
    drawPixel(10, 9, SKIN_LIGHT);
    
    drawPixel(4, 10, VEST_GREEN);
    drawPixel(5, 10, VEST_GREEN);
    drawPixel(6, 10, VEST_GREEN);
    drawPixel(7, 10, VEST_GREEN);
    drawPixel(8, 10, VEST_GREEN);
    
    // Pants - dark
    drawPixel(4, 11, UNIFORM_DARK);
    drawPixel(5, 11, UNIFORM_DARK);
    drawPixel(6, 11, UNIFORM_DARK);
    drawPixel(7, 11, UNIFORM_DARK);
    drawPixel(8, 11, UNIFORM_DARK);
    
    drawPixel(4, 12, UNIFORM_DARK);
    drawPixel(5, 12, UNIFORM_DARK);
    drawPixel(7, 12, UNIFORM_DARK);
    drawPixel(8, 12, UNIFORM_DARK);
    
    drawPixel(4, 13, UNIFORM_DARK);
    drawPixel(5, 13, UNIFORM_DARK);
    drawPixel(7, 13, UNIFORM_DARK);
    drawPixel(8, 13, UNIFORM_DARK);
    
    drawPixel(4, 14, UNIFORM_DARK);
    drawPixel(5, 14, UNIFORM_DARK);
    drawPixel(7, 14, UNIFORM_DARK);
    drawPixel(8, 14, UNIFORM_DARK);
    
    // Black shoes
    drawPixel(3, 15, HAT_BLACK);
    drawPixel(4, 15, HAT_BLACK);
    drawPixel(5, 15, HAT_BLACK);
    drawPixel(7, 15, HAT_BLACK);
    drawPixel(8, 15, HAT_BLACK);
  };
  
  redrawSprite();
  
  container.add(graphics);
  graphics.setVisible(true);
  
  return container;
}

