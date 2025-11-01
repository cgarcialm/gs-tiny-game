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
  const HAIR_BROWN = 0x5d4037;
  const SKIN = 0xffe5cc;
  const SHIRT_GREEN = 0x81c784;
  const PANTS_BLUE = 0x64b5f6;
  const EYE_BLACK = 0x000000;
  const MOUTH_PINK = 0xffb6c1;
  
  const spriteWidth = 10;
  const spriteHeight = 12;
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  const drawPixel = createDrawPixel(graphics, pixelSize, offsetX, offsetY);
  
  const drawSprite = (mouthOpen: boolean) => {
    graphics.clear();
    
    // Glow effect (behind sprite)
    const glowSize = container.getData('glowSize') || 12;
    graphics.fillStyle(0x81c784, 0.3); // Green glow (soft)
    graphics.fillCircle(0, 0, glowSize);
    
    // Hair (top)
    drawPixel(3, 1, HAIR_BROWN);
    drawPixel(4, 1, HAIR_BROWN);
    drawPixel(5, 1, HAIR_BROWN);
    drawPixel(6, 1, HAIR_BROWN);
    
    // Head/face
    drawPixel(3, 2, SKIN);
    drawPixel(4, 2, SKIN);
    drawPixel(5, 2, SKIN);
    drawPixel(6, 2, SKIN);
    
    // Eye
    drawPixel(5, 2, EYE_BLACK);
    
    // Mouth area
    if (mouthOpen) {
      // Open mouth (black)
      drawPixel(6, 3, EYE_BLACK);
    } else {
      // Closed mouth (skin)
      drawPixel(6, 3, SKIN);
    }
    
    // Neck/body
    drawPixel(3, 3, SKIN);
    drawPixel(4, 3, SKIN);
    drawPixel(5, 3, SKIN);
    
    // Shirt (green)
    drawPixel(3, 4, SHIRT_GREEN);
    drawPixel(4, 4, SHIRT_GREEN);
    drawPixel(5, 4, SHIRT_GREEN);
    drawPixel(6, 4, SHIRT_GREEN);
    
    drawPixel(3, 5, SHIRT_GREEN);
    drawPixel(4, 5, SHIRT_GREEN);
    drawPixel(5, 5, SHIRT_GREEN);
    drawPixel(6, 5, SHIRT_GREEN);
    
    // Pants (blue)
    drawPixel(3, 6, PANTS_BLUE);
    drawPixel(4, 6, PANTS_BLUE);
    drawPixel(5, 6, PANTS_BLUE);
    drawPixel(6, 6, PANTS_BLUE);
    
    drawPixel(3, 7, PANTS_BLUE);
    drawPixel(4, 7, PANTS_BLUE);
    drawPixel(5, 7, PANTS_BLUE);
    drawPixel(6, 7, PANTS_BLUE);
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

