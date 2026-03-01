import Phaser from "phaser";
import { createDrawPixel } from "./spriteUtils";

/**
 * Smush side-view sprite for Pac-Man style game
 * Tortoiseshell cat with open/close mouth animation
 */
export function createSmushPacManSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 2;
  const graphics = scene.add.graphics();
  
  // Colors - tortoiseshell cat
  const BLACK = 0x000000;
  const BLACK_SOFT = 0x1a1a1a;
  const ORANGE = 0xd97c3c;
  const ORANGE_DARK = 0xb5632e;
  const TAN = 0xc4a57b;
  const WHITE = 0xffffff;
  const EYE_YELLOW = 0xf4e04d;
  const NOSE_PINK = 0xe89db5;
  
  const spriteWidth = 12;
  const spriteHeight = 10;
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  const drawPixel = createDrawPixel(graphics, pixelSize, offsetX, offsetY);
  
  const drawSprite = (mouthOpen: boolean) => {
    graphics.clear();
    
    // Glow effect (behind sprite)
    const glowSize = container.getData('glowSize') || 8; // Default
    const glowOpacity = container.getData('glowOpacity') || 0.6; // Default opacity
    graphics.fillStyle(0xd97c3c, glowOpacity); // Orange glow
    graphics.fillCircle(0, 0, glowSize);
    
    // Ear (top-left)
    drawPixel(3, 0, ORANGE_DARK);
    drawPixel(4, 0, BLACK);
    
    // Head (tortie pattern)
    drawPixel(3, 1, BLACK);
    drawPixel(4, 1, BLACK);
    drawPixel(5, 1, ORANGE);
    drawPixel(6, 1, ORANGE_DARK);
    drawPixel(7, 1, BLACK);
    
    // Face with eye
    drawPixel(3, 2, BLACK);
    drawPixel(4, 2, ORANGE);
    drawPixel(5, 2, TAN);
    drawPixel(6, 2, EYE_YELLOW); // Eye yellow base
    
    // Pupil (small black dot in eye)
    graphics.fillStyle(BLACK, 1);
    graphics.fillRect(
      offsetX + 6 * pixelSize + pixelSize / 2,
      offsetY + 2 * pixelSize + pixelSize / 2,
      pixelSize / 2,
      pixelSize / 2
    );
    
    // Nose and mouth
    if (mouthOpen) {
      // Open mouth (pink/dark)
      drawPixel(6, 4, BLACK); // Open mouth showing
      drawPixel(7, 4, BLACK);
    } else {
      // Closed mouth
      drawPixel(6, 4, ORANGE_DARK);
      drawPixel(7, 4, BLACK_SOFT);
    }
    
    drawPixel(3, 3, BLACK);
    drawPixel(4, 3, TAN);
    drawPixel(5, 3, ORANGE);
    drawPixel(6, 3, BLACK);
    drawPixel(7, 3, NOSE_PINK); // Pink nose
    
    // White chin
    drawPixel(4, 4, WHITE);
    drawPixel(5, 4, WHITE);
    
    // Body (tortie pattern)
    drawPixel(2, 4, BLACK);
    drawPixel(3, 4, BLACK);
    
    drawPixel(2, 5, BLACK);
    drawPixel(3, 5, ORANGE);
    drawPixel(4, 5, TAN);
    drawPixel(5, 5, BLACK);
    drawPixel(6, 5, ORANGE_DARK);
    drawPixel(7, 5, BLACK);
    
    drawPixel(2, 6, BLACK);
    drawPixel(3, 6, BLACK_SOFT);
    drawPixel(4, 6, ORANGE);
    drawPixel(5, 6, TAN);
    drawPixel(6, 6, BLACK);
    
    // Tail
    drawPixel(1, 5, BLACK);
    drawPixel(1, 4, ORANGE);
    drawPixel(0, 3, TAN);
  };
  
  // Initial draw
  drawSprite(true);
  container.add(graphics);
  
  // Store draw functions
  container.setData('drawMouthOpen', () => drawSprite(true));
  container.setData('drawMouthClosed', () => drawSprite(false));
  
  return container;
}

/**
 * Animate Smush's mouth chomping
 */
export function animateSmushChomp(container: Phaser.GameObjects.Container, scene: Phaser.Scene) {
  const drawOpen = container.getData('drawMouthOpen');
  const drawClosed = container.getData('drawMouthClosed');
  
  let isOpen = true;
  
  scene.time.addEvent({
    delay: 200,
    loop: true,
    callback: () => {
      isOpen = !isOpen;
      if (isOpen) {
        drawOpen();
      } else {
        drawClosed();
      }
    }
  });
}

