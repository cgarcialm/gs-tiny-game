import Phaser from "phaser";
import { createDrawPixel, createDrawSmallDot, createDrawOutlinePixel } from "./spriteUtils";

/**
 * Creates a pixel art sprite for Eboshi (a greyhound dog) wearing a cozy sweater
 * Based on the greyhound pixel art with added sweater covering the body
 */
export function createEboshiWithSweaterSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const pixelSize = 2; // Size of each pixel block
  
  // Colors - dark gray silhouette with eyes
  const DOG_DARK_GRAY = 0x1a1a1a;   // Darker gray for dog body
  const OUTLINE_BLACK = 0x000000;   // Black outline
  const EYE_WHITE = 0xcccccc;       // Light gray for eyes
  const EYE_PUPIL = 0x000000;       // Black pupil
  
  // Sweater colors - rich green with white stripe
  const SWEATER_MAIN = 0x3d7a4f;    // Medium-rich green
  const SWEATER_STRIPE = 0xf0f0f0;  // White/cream stripe
  
  // Create graphics object for drawing pixels
  const graphics = scene.add.graphics();
  
  // Offset to center the sprite (simple silhouette: ~20 pixels wide, ~16 pixels tall)
  const spriteWidth = 20;
  const spriteHeight = 16;
  const offsetX = -(spriteWidth * pixelSize) / 2;
  const offsetY = -(spriteHeight * pixelSize) / 2;
  
  // Helper functions from shared utilities
  const drawPixel = createDrawPixel(graphics, pixelSize, offsetX, offsetY);
  const drawSmallDot = createDrawSmallDot(graphics, pixelSize, offsetX, offsetY);
  const drawOutlinePixel = createDrawOutlinePixel(graphics, pixelSize, offsetX, offsetY, OUTLINE_BLACK);
  
  const redrawSprite = () => {
    graphics.clear();
    
    // Simple dark gray silhouette - side view facing right
    // Dark gray, blocky, minimal design
    
    // Draw all body pixels first (no outlines)
    // Ear (pointed, upright)
    drawPixel(5, 1, DOG_DARK_GRAY);
    drawPixel(6, 1, DOG_DARK_GRAY);
    drawPixel(5, 2, DOG_DARK_GRAY);
    
    // Head (small, rectangular)
    drawPixel(3, 2, DOG_DARK_GRAY);
    drawPixel(4, 2, DOG_DARK_GRAY);
    drawPixel(5, 2, DOG_DARK_GRAY);
    drawPixel(3, 3, DOG_DARK_GRAY);
    drawPixel(4, 3, DOG_DARK_GRAY);
    drawPixel(5, 3, DOG_DARK_GRAY);
    
    // Muzzle (short, blocky)
    drawPixel(1, 3, DOG_DARK_GRAY);
    drawPixel(2, 3, DOG_DARK_GRAY);
    drawPixel(3, 3, DOG_DARK_GRAY);  // Already drawn as head
    drawPixel(2, 4, DOG_DARK_GRAY);
    drawPixel(3, 4, DOG_DARK_GRAY);
    
    // Neck (now part of sweater collar)
    drawPixel(4, 4, SWEATER_MAIN);
    drawPixel(4, 5, SWEATER_MAIN);
    
    // Body with SWEATER - warm red with cream stripe
    // Top row of sweater
    drawPixel(4, 6, SWEATER_MAIN);
    drawPixel(5, 6, SWEATER_MAIN);
    drawPixel(6, 6, SWEATER_MAIN);
    drawPixel(7, 6, SWEATER_MAIN);
    drawPixel(8, 6, SWEATER_MAIN);
    drawPixel(9, 6, SWEATER_MAIN);
    drawPixel(10, 6, SWEATER_MAIN);
    drawPixel(11, 6, SWEATER_MAIN);
    
    // Cream stripe row
    drawPixel(4, 7, SWEATER_STRIPE);
    drawPixel(5, 7, SWEATER_STRIPE);
    drawPixel(6, 7, SWEATER_STRIPE);
    drawPixel(7, 7, SWEATER_STRIPE);
    drawPixel(8, 7, SWEATER_STRIPE);
    drawPixel(9, 7, SWEATER_STRIPE);
    drawPixel(10, 7, SWEATER_STRIPE);
    drawPixel(11, 7, SWEATER_STRIPE);
    drawPixel(12, 7, SWEATER_STRIPE);
    
    // Bottom of sweater
    drawPixel(5, 8, SWEATER_MAIN);
    drawPixel(6, 8, SWEATER_MAIN);
    drawPixel(7, 8, SWEATER_MAIN);
    drawPixel(8, 8, SWEATER_MAIN);
    drawPixel(9, 8, SWEATER_MAIN);
    drawPixel(10, 8, SWEATER_MAIN);
    drawPixel(11, 8, SWEATER_MAIN);
    drawPixel(12, 8, SWEATER_MAIN);
    
    // Lower body - sweater extends one more row at front
    drawPixel(5, 9, SWEATER_MAIN);
    drawPixel(6, 9, SWEATER_MAIN);
    drawPixel(7, 9, SWEATER_MAIN);
    drawPixel(8, 9, SWEATER_MAIN);
    drawPixel(11, 9, DOG_DARK_GRAY);
    drawPixel(12, 9, DOG_DARK_GRAY);

    drawPixel(5, 10, DOG_DARK_GRAY);
    
    // Right front leg
    drawPixel(6, 10, DOG_DARK_GRAY);
    drawPixel(6, 11, DOG_DARK_GRAY);
    drawPixel(6, 12, DOG_DARK_GRAY);
    drawPixel(6, 13, DOG_DARK_GRAY);
    drawPixel(5, 13, DOG_DARK_GRAY);
    
    // Back legs (thick, blocky columns with slight hock bend)
    drawPixel(11, 10, DOG_DARK_GRAY);
    drawPixel(12, 10, DOG_DARK_GRAY);
    drawPixel(12, 11, DOG_DARK_GRAY);
    drawPixel(12, 12, DOG_DARK_GRAY);
    drawPixel(12, 13, DOG_DARK_GRAY);
    drawPixel(11, 13, DOG_DARK_GRAY);
    
    // Tail (curled up and forward over back)
    drawPixel(13, 6, DOG_DARK_GRAY);
    drawPixel(14, 5, DOG_DARK_GRAY);
    drawPixel(14, 4, DOG_DARK_GRAY);
    drawPixel(15, 3, DOG_DARK_GRAY);
    drawPixel(15, 2, DOG_DARK_GRAY);
    drawPixel(14, 1, DOG_DARK_GRAY);
    
    // Minimal outline - only the most essential outer edges
    // Top silhouette - ear and head
    drawOutlinePixel(5, 1, 'top');
    
    // Leftmost point - muzzle tip
    drawOutlinePixel(1, 3, 'left');
    
    // Rightmost point - tail
    drawOutlinePixel(15, 2, 'right');
    drawOutlinePixel(15, 2, 'top');
    
    // Bottom - feet only
    drawOutlinePixel(5, 13, 'bottom');
    drawOutlinePixel(12, 13, 'bottom');
    
    // Eye (side view - visible eye on the face, drawn last so nothing overwrites it)
    drawPixel(4, 2, EYE_WHITE);
    drawSmallDot(4, 2, EYE_PUPIL);
  };
  
  // Initial draw
  redrawSprite();
  
  // Add graphics to container
  container.add(graphics);
  
  // Store redraw function for potential future animations
  container.setData("redraw", redrawSprite);
  
  return container;
}

