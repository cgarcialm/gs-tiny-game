import Phaser from "phaser";
import { createDrawPixel, createDrawSmallDot } from "./spriteUtils";

/**
 * Creates a pixel art sprite for Smush (a chubby brown cat with beige spots)
 * Cat in sitting position
 */
export function createSmushSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 2; // Size of each pixel block
  
  // Colors - brown cat with beige spots
  const BLACK = 0x1a1a1a;           // Black for body accents
  const BROWN_DARK = 0x2c1810;      // Dark brown for main body
  const BROWN_MED = 0x5d4037;       // Medium brown for shading
  const BEIGE = 0xa1887f;           // Beige for spots
  const BEIGE_LIGHT = 0xbcaaa4;     // Light beige for highlights
  const NOSE_BLACK = 0x000000;      // Black nose
  const EYE_YELLOW = 0xffd54f;      // Yellow eyes
  const EYE_PUPIL = 0x000000;       // Black pupil
  
  // Create graphics object for drawing pixels
  const graphics = scene.add.graphics();
  
  // Offset to center the sprite (cat: ~18 pixels wide, ~20 pixels tall)
  const spriteWidth = 18;
  const spriteHeight = 20;
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  // Helper functions from shared utilities
  const drawPixel = createDrawPixel(graphics, pixelSize, offsetX, offsetY);
  const drawSmallDot = createDrawSmallDot(graphics, pixelSize, offsetX, offsetY);
  
  const redrawSprite = () => {
    graphics.clear();
    graphics.setBlendMode(Phaser.BlendModes.NORMAL);
    
    // EARS (pointy triangular ears)
    // Left ear
    drawPixel(4, 1, BROWN_DARK);
    drawPixel(5, 1, BROWN_DARK);
    drawPixel(4, 2, BROWN_DARK);
    drawPixel(5, 2, BROWN_MED);
    
    // Right ear
    drawPixel(12, 1, BROWN_DARK);
    drawPixel(13, 1, BROWN_DARK);
    drawPixel(12, 2, BROWN_MED);
    drawPixel(13, 2, BROWN_DARK);
    
    // HEAD (round, chubby)
    // Top of head
    drawPixel(6, 2, BROWN_DARK);
    drawPixel(7, 2, BROWN_DARK);
    drawPixel(8, 2, BROWN_MED);        // Beige spot on forehead
    drawPixel(9, 2, BROWN_MED);
    drawPixel(10, 2, BROWN_DARK);
    drawPixel(11, 2, BROWN_DARK);
    
    // Upper face
    drawPixel(5, 3, BROWN_DARK);
    drawPixel(6, 3, BROWN_MED);
    drawPixel(7, 3, BROWN_MED);
    drawPixel(8, 3, BROWN_MED);    // Small beige spot
    drawPixel(9, 3, BROWN_MED);
    drawPixel(10, 3, BROWN_MED);
    drawPixel(11, 3, BROWN_DARK);
    drawPixel(12, 3, BROWN_DARK);
    
    // Face with eyes
    drawPixel(5, 4, BROWN_DARK);
    drawPixel(6, 4, EYE_YELLOW);     // Left eye
    drawPixel(7, 4, BROWN_MED);
    drawPixel(8, 4, BEIGE_LIGHT);    // Small beige between eyes
    drawPixel(9, 4, BROWN_MED);
    drawPixel(10, 4, EYE_YELLOW);    // Right eye
    drawPixel(11, 4, BROWN_DARK);
    drawPixel(12, 4, BROWN_DARK);
    
    // Face lower (with nose)
    drawPixel(5, 5, BROWN_DARK);
    drawPixel(6, 5, BROWN_MED);
    drawPixel(7, 5, BEIGE_LIGHT);    // Beige around nose
    drawPixel(8, 5, NOSE_BLACK);     // Nose
    drawPixel(9, 5, BEIGE_LIGHT);    // Beige around nose
    drawPixel(10, 5, BROWN_MED);
    drawPixel(11, 5, BROWN_DARK);
    
    // Cheeks/whisker area
    drawPixel(4, 6, BROWN_DARK);
    drawPixel(5, 6, BROWN_DARK);
    drawPixel(6, 6, BROWN_MED);
    drawPixel(7, 6, BEIGE_LIGHT);    // Small beige spot on chin
    drawPixel(8, 6, BEIGE_LIGHT);
    drawPixel(9, 6, BROWN_MED);
    drawPixel(10, 6, BROWN_DARK);
    drawPixel(11, 6, BROWN_DARK);
    drawPixel(12, 6, BROWN_DARK);
    
    // Pupils (small dark dots in eyes)
    drawSmallDot(6, 4, EYE_PUPIL, 1.2);
    drawSmallDot(10, 4, EYE_PUPIL, 1.2);
    
    // BODY (chubby, sitting position)
    // Neck/upper body
    drawPixel(6, 7, BLACK);          // Black accent on neck
    drawPixel(7, 7, BROWN_MED);
    drawPixel(8, 7, BROWN_MED);
    drawPixel(9, 7, BROWN_MED);
    drawPixel(10, 7, BLACK);         // Black accent on neck
    
    // Wide body with beige spot
    drawPixel(5, 8, BLACK);          // Black accent on shoulder
    drawPixel(6, 8, BROWN_MED);
    drawPixel(7, 8, BEIGE);          // Beige spot on chest
    drawPixel(8, 8, BEIGE);
    drawPixel(9, 8, BROWN_MED);
    drawPixel(10, 8, BROWN_DARK);
    drawPixel(11, 8, BLACK);         // Black accent on side
    
    // Mid body (widest part - chubby!)
    drawPixel(4, 9, BROWN_DARK);
    drawPixel(5, 9, BROWN_MED);
    drawPixel(6, 9, BROWN_MED);
    drawPixel(7, 9, BLACK);          // Black accent on body
    drawPixel(8, 9, BROWN_MED);
    drawPixel(9, 9, BLACK);          // Black accent on body
    drawPixel(10, 9, BROWN_MED);
    drawPixel(11, 9, BROWN_DARK);
    drawPixel(12, 9, BROWN_DARK);
    
    drawPixel(4, 10, BROWN_DARK);
    drawPixel(5, 10, BROWN_MED);
    drawPixel(6, 10, BROWN_MED);         // Beige spot on side
    drawPixel(7, 10, BLACK);         // Black accent on body
    drawPixel(8, 10, BROWN_MED);
    drawPixel(9, 10, BLACK);         // Black accent on body
    drawPixel(10, 10, BROWN_MED);
    drawPixel(11, 10, BROWN_DARK);
    drawPixel(12, 10, BROWN_DARK);
    
    // Lower body
    drawPixel(4, 11, BLACK);         // Black accent
    drawPixel(5, 11, BROWN_MED);
    drawPixel(6, 11, BLACK);         // Black accent
    drawPixel(7, 11, BROWN_DARK);
    drawPixel(8, 11, BROWN_MED);
    drawPixel(9, 11, BROWN_DARK);
    drawPixel(10, 11, BLACK);        // Black accent
    drawPixel(11, 11, BROWN_DARK);
    drawPixel(12, 11, BLACK);        // Black accent
    
    // Bottom body (sitting)
    drawPixel(5, 12, BLACK);         // Black accent
    drawPixel(6, 12, BROWN_DARK);
    drawPixel(7, 12, BROWN_MED);
    drawPixel(8, 12, BLACK);         // Black accent
    drawPixel(9, 12, BROWN_MED);
    drawPixel(10, 12, BROWN_DARK);
    drawPixel(11, 12, BLACK);        // Black accent
    
    // FRONT PAWS (small, tucked in)
    // drawPixel(5, 13, BEIGE);
    drawPixel(6, 13, BEIGE);
    drawPixel(7, 13, BROWN_DARK);
    drawPixel(9, 13, BROWN_DARK);
    drawPixel(10, 13, BEIGE);
    // drawPixel(11, 13, BEIGE);
    
    // TAIL (curled to the side)
    drawPixel(13, 10, BROWN_DARK);
    drawPixel(14, 9, BROWN_DARK);
    drawPixel(15, 8, BROWN_MED);
    drawPixel(15, 7, BEIGE);         // Beige spot on tail
    drawPixel(15, 6, BROWN_MED);
    drawPixel(14, 5, BROWN_DARK);
    drawPixel(13, 5, BROWN_DARK);
  };
  
  // Initial draw
  redrawSprite();
  
  // Add graphics to container
  container.add(graphics);
  
  // Store redraw function for potential future animations
  container.setData("redraw", redrawSprite);
  
  return container;
}

