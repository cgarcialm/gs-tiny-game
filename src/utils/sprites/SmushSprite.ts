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
  
  // Colors - tortoiseshell cat (black with orange patches)
  const BLACK = 0x000000;           // Pure black (base color)
  const BLACK_SOFT = 0x1a1a1a;      // Softer black for variation
  const ORANGE = 0xd97c3c;          // Orange patches (tortie)
  const ORANGE_DARK = 0xb5632e;     // Darker orange
  const TAN = 0xc4a57b;             // Tan patches
  const WHITE = 0xffffff;           // White chin patch
  const NOSE_PINK = 0xe89db5;       // Pink nose
  const EYE_YELLOW = 0xf4e04d;      // Bright yellow eyes
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
    // Left ear (black)
    drawPixel(4, 1, BLACK);
    drawPixel(5, 1, BLACK);
    drawPixel(4, 2, BLACK);
    drawPixel(5, 2, BLACK);
    
    // Right ear (very dark - almost black with brown tint)
    drawPixel(12, 1, BLACK);
    drawPixel(13, 1, BLACK);
    drawPixel(12, 2, BLACK_SOFT);
    drawPixel(13, 2, BLACK_SOFT);
    
    // HEAD (tortoiseshell pattern - mostly black with orange patches)
    // Top of head (black left side, orange right side)
    drawPixel(6, 2, BLACK);
    drawPixel(7, 2, BLACK);
    drawPixel(8, 2, BLACK_SOFT);
    drawPixel(9, 2, ORANGE_DARK);    // Orange patch starts
    drawPixel(10, 2, ORANGE);
    drawPixel(11, 2, ORANGE);
    
    // Upper face (mottled pattern)
    drawPixel(5, 3, BLACK);
    drawPixel(6, 3, BLACK);
    drawPixel(7, 3, BLACK_SOFT);
    drawPixel(8, 3, TAN);            // Tan patch
    drawPixel(9, 3, ORANGE);         // Orange patch
    drawPixel(10, 3, ORANGE);
    drawPixel(11, 3, ORANGE_DARK);
    drawPixel(12, 3, BLACK);
    
    // Face with eyes
    drawPixel(5, 4, BLACK);
    drawPixel(6, 4, EYE_YELLOW);     // Left eye
    drawPixel(7, 4, BLACK);
    drawPixel(8, 4, TAN);            // Tan between eyes
    drawPixel(9, 4, BLACK_SOFT);
    drawPixel(10, 4, EYE_YELLOW);    // Right eye
    drawPixel(11, 4, ORANGE);
    drawPixel(12, 4, BLACK);
    
    // Face lower (with pink nose)
    drawPixel(5, 5, BLACK);
    drawPixel(6, 5, BLACK_SOFT);
    drawPixel(7, 5, TAN);
    drawPixel(8, 5, NOSE_PINK);      // Pink nose
    drawPixel(9, 5, TAN);
    drawPixel(10, 5, BLACK_SOFT);
    drawPixel(11, 5, ORANGE);
    
    // Cheeks/whisker area (with white chin patch)
    drawPixel(4, 6, BLACK);
    drawPixel(5, 6, BLACK);
    drawPixel(6, 6, BLACK_SOFT);
    drawPixel(7, 6, WHITE);          // White chin
    drawPixel(8, 6, WHITE);          // White chin
    drawPixel(9, 6, TAN);
    drawPixel(10, 6, ORANGE);
    drawPixel(11, 6, BLACK);
    drawPixel(12, 6, BLACK);
    
    // Pupils (small dark dots in eyes)
    drawSmallDot(6, 4, EYE_PUPIL, 1.2);
    drawSmallDot(10, 4, EYE_PUPIL, 1.2);
    
    // BODY (tortoiseshell pattern - mottled black, orange, tan)
    // Neck/upper body
    drawPixel(6, 7, BLACK);
    drawPixel(7, 7, BLACK_SOFT);
    drawPixel(8, 7, TAN);
    drawPixel(9, 7, ORANGE);
    drawPixel(10, 7, BLACK);
    
    // Wide body (tortie patches)
    drawPixel(5, 8, BLACK);
    drawPixel(6, 8, BLACK);
    drawPixel(7, 8, TAN);            // Tan patch
    drawPixel(8, 8, ORANGE);         // Orange patch
    drawPixel(9, 9, ORANGE_DARK);
    drawPixel(10, 8, BLACK_SOFT);
    drawPixel(11, 8, BLACK);
    
    // Mid body (widest part - chubby with patches!)
    drawPixel(4, 9, BLACK);
    drawPixel(5, 9, BLACK);
    drawPixel(6, 9, ORANGE_DARK);    // Orange patch
    drawPixel(7, 9, ORANGE);
    drawPixel(8, 9, TAN);
    drawPixel(9, 9, BLACK);
    drawPixel(10, 9, BLACK_SOFT);
    drawPixel(11, 9, ORANGE);
    drawPixel(12, 9, BLACK);
    
    drawPixel(4, 10, BLACK);
    drawPixel(5, 10, BLACK);
    drawPixel(6, 10, ORANGE);
    drawPixel(7, 10, TAN);
    drawPixel(8, 10, BLACK);
    drawPixel(9, 10, BLACK_SOFT);
    drawPixel(10, 10, ORANGE_DARK);
    drawPixel(11, 10, BLACK);
    drawPixel(12, 10, BLACK);
    
    // Lower body (mottled)
    drawPixel(4, 11, BLACK);
    drawPixel(5, 11, BLACK_SOFT);
    drawPixel(6, 11, BLACK);
    drawPixel(7, 11, TAN);
    drawPixel(8, 11, ORANGE);
    drawPixel(9, 11, BLACK);
    drawPixel(10, 11, BLACK);
    drawPixel(11, 11, ORANGE_DARK);
    drawPixel(12, 11, BLACK);
    
    // Bottom body (sitting)
    drawPixel(5, 12, BLACK);
    drawPixel(6, 12, BLACK);
    drawPixel(7, 12, BLACK_SOFT);
    drawPixel(8, 12, TAN);
    drawPixel(9, 12, BLACK);
    drawPixel(10, 12, BLACK);
    drawPixel(11, 12, BLACK);
    drawPixel(12, 12, BLACK);
    
    // FRONT PAWS (small, black)
    drawPixel(5, 13, BLACK);
    drawPixel(6, 13, BLACK);
    drawPixel(7, 13, BLACK_SOFT);
    drawPixel(9, 13, BLACK);
    drawPixel(10, 13, BLACK);
    
    // TAIL (curled - tortie pattern)
    // Tail base
    drawPixel(13, 11, BLACK);
    drawPixel(13, 10, BLACK);
    drawPixel(14, 10, ORANGE_DARK);  // Orange in tail
    
    // Mid tail
    drawPixel(14, 9, BLACK);
    drawPixel(15, 9, ORANGE);        // Orange stripe
    drawPixel(15, 8, BLACK);
    drawPixel(16, 8, TAN);
    
    // Upper tail
    drawPixel(16, 7, BLACK);
    drawPixel(16, 6, ORANGE);
    
    // Tail tip (black with tan)
    drawPixel(15, 6, BLACK);
    drawPixel(15, 5, TAN);
  };
  
  // Initial draw
  redrawSprite();
  
  // Add graphics to container
  container.add(graphics);
  
  // Store redraw function for potential future animations
  container.setData("redraw", redrawSprite);
  
  return container;
}

