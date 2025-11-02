import Phaser from "phaser";
import { createDrawPixel } from "./spriteUtils";

/**
 * Grayson side-view sprite for Pac-Man style game
 * Has open/close mouth animation
 */
export function createGraysonPacManSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 2;
  const graphics = scene.add.graphics();
  
  // Colors
  const HAIR_YELLOW = 0xffd700;
  const CAP_BLUE = 0x1e88e5;
  const SKIN = 0xffe5cc;
  const SHIRT_GREEN = 0x81c784;
  const PANTS_BLUE = 0x64b5f6;
  const EYE_BLACK = 0x000000;
  
  const spriteWidth = 10;
  const spriteHeight = 7; // Shorter!
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  const drawPixel = createDrawPixel(graphics, pixelSize, offsetX, offsetY);
  
  const drawSprite = (mouthOpen: boolean) => {
    graphics.clear();
    
    // Glow effect (behind sprite)
    const glowSize = container.getData('glowSize') || 8; // Default
    const glowOpacity = container.getData('glowOpacity') || 0.6; // Default opacity
    graphics.fillStyle(0x81c784, glowOpacity); // Green glow
    graphics.fillCircle(0, 0, glowSize);
    
    // Cap (blue) - top
    drawPixel(3, 0, CAP_BLUE);
    drawPixel(4, 0, CAP_BLUE);
    drawPixel(5, 0, CAP_BLUE);
    drawPixel(6, 0, CAP_BLUE);
    
    // Cap brim + yellow hair in back
    drawPixel(3, 1, HAIR_YELLOW); // Yellow hair showing in back!
    drawPixel(4, 1, CAP_BLUE);
    drawPixel(5, 1, CAP_BLUE);
    drawPixel(6, 1, CAP_BLUE);
    drawPixel(7, 1, CAP_BLUE);
    
    // Head/face
    drawPixel(3, 2, SKIN);
    drawPixel(4, 2, SKIN);
    drawPixel(5, 2, SKIN);
    drawPixel(6, 2, SKIN);
    drawPixel(7, 2, SKIN);
    
    // Eye
    drawPixel(5, 2, EYE_BLACK);
    
    // Mouth/neck area
    drawPixel(3, 3, SKIN);
    drawPixel(4, 3, SKIN);
    drawPixel(5, 3, SKIN);
    drawPixel(6, 3, SKIN);
    
    if (mouthOpen) {
      // Open mouth (black)
      drawPixel(7, 3, EYE_BLACK);
    } else {
      // Closed mouth (skin)
      drawPixel(7, 3, SKIN);
    }
    
    // Shirt (green) - 2 rows
    drawPixel(3, 4, SHIRT_GREEN);
    drawPixel(4, 4, SHIRT_GREEN);
    drawPixel(5, 4, SHIRT_GREEN);
    drawPixel(6, 4, SHIRT_GREEN);
    drawPixel(7, 4, SHIRT_GREEN);
    
    drawPixel(3, 5, SHIRT_GREEN);
    drawPixel(4, 5, SHIRT_GREEN);
    drawPixel(5, 5, SHIRT_GREEN);
    drawPixel(6, 5, SHIRT_GREEN);
    drawPixel(7, 5, SHIRT_GREEN);
    
    // Pants (blue) - 1 row
    drawPixel(3, 6, PANTS_BLUE);
    drawPixel(4, 6, PANTS_BLUE);
    drawPixel(5, 6, PANTS_BLUE);
    drawPixel(6, 6, PANTS_BLUE);
    drawPixel(7, 6, PANTS_BLUE);
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
 * Animate mouth chomping
 */
export function animateGraysonChomp(container: Phaser.GameObjects.Container, scene: Phaser.Scene) {
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

