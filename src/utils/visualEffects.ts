import Phaser from "phaser";

/**
 * Visual Effects Utilities
 * Centralized functions for creating visual feedback effects like floating text, particles, etc.
 * Reduces code duplication across scenes and provides consistent visual polish.
 */

/**
 * Configuration for floating text effects
 */
export interface FloatingTextConfig {
  fontSize?: string;
  color?: string;
  fontFamily?: string;
  fontStyle?: string;
  duration?: number;
  distance?: number;
  ease?: string;
  backgroundColor?: string;
  padding?: { left: number; right: number; top: number; bottom: number };
  stroke?: string;
  strokeThickness?: number;
  align?: string;
  fadeDelay?: number;
  fadeDuration?: number;
  depth?: number;
}

/**
 * Configuration for particle burst effects
 */
export interface ParticleBurstConfig {
  particleCount?: number;
  colors?: number[];
  distance?: number;
  duration?: number;
  size?: number;
  sizeVariation?: number;
  ease?: string;
  shape?: 'rectangle' | 'circle';
  depth?: number;
}

/**
 * Default configuration for floating text
 */
const DEFAULT_FLOATING_TEXT: Required<FloatingTextConfig> = {
  fontSize: "12px",
  color: "#ffeb3b",
  fontFamily: "monospace",
  fontStyle: "bold",
  duration: 1000,
  distance: 30,
  ease: "Power2",
  backgroundColor: "",
  padding: { left: 0, right: 0, top: 0, bottom: 0 },
  stroke: "",
  strokeThickness: 0,
  align: "center",
  fadeDelay: 0,
  fadeDuration: 1000,
  depth: 50,
};

/**
 * Default configuration for particle bursts
 */
const DEFAULT_PARTICLE_BURST: Required<ParticleBurstConfig> = {
  particleCount: 8,
  colors: [0xffffff],
  distance: 20,
  duration: 400,
  size: 3,
  sizeVariation: 0,
  ease: "Power2",
  shape: 'rectangle',
  depth: 20,
};

/**
 * Create a floating text effect that rises and fades out
 * Used for damage numbers, pickups, dialogue, crowd reactions, etc.
 * 
 * @param scene - The Phaser scene to add the text to
 * @param x - X position to spawn the text
 * @param y - Y position to spawn the text
 * @param text - The text content to display
 * @param config - Optional configuration for appearance and animation
 * @returns The created text object
 * 
 * @example
 * ```typescript
 * // Simple floating damage number
 * spawnFloatingText(this, enemy.x, enemy.y, "10");
 * 
 * // Crowd chatter with background
 * spawnFloatingText(this, 100, 50, "Go team!", {
 *   backgroundColor: "#ffffff",
 *   padding: { left: 2, right: 2, top: 1, bottom: 1 },
 *   stroke: "#000000",
 *   strokeThickness: 3
 * });
 * 
 * // Custom styled message
 * spawnFloatingText(this, x, y, "Level Up!", {
 *   fontSize: "16px",
 *   color: "#00ff00",
 *   distance: 50,
 *   duration: 2000
 * });
 * ```
 */
export function spawnFloatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  config: FloatingTextConfig = {}
): Phaser.GameObjects.Text {
  // Merge with defaults
  const merged = { ...DEFAULT_FLOATING_TEXT, ...config };
  
  // Create text style object
  const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: merged.fontFamily,
    fontSize: merged.fontSize,
    color: merged.color,
    fontStyle: merged.fontStyle,
    align: merged.align,
    resolution: 2,
  };
  
  // Add optional styles
  if (merged.backgroundColor) {
    textStyle.backgroundColor = merged.backgroundColor;
  }
  if (merged.padding.left > 0 || merged.padding.right > 0 || merged.padding.top > 0 || merged.padding.bottom > 0) {
    textStyle.padding = merged.padding;
  }
  if (merged.stroke) {
    textStyle.stroke = merged.stroke;
    textStyle.strokeThickness = merged.strokeThickness;
  }
  
  // Create the text object
  const floatingText = scene.add
    .text(x, y, text, textStyle)
    .setOrigin(0.5)
    .setDepth(merged.depth);
  
  // Animate floating upward
  scene.tweens.add({
    targets: floatingText,
    y: y - merged.distance,
    duration: merged.duration,
    ease: merged.ease,
  });
  
  // Animate fading out
  scene.tweens.add({
    targets: floatingText,
    alpha: 0,
    duration: merged.fadeDuration,
    delay: merged.fadeDelay,
    ease: merged.ease,
    onComplete: () => {
      floatingText.destroy();
    },
  });
  
  return floatingText;
}

/**
 * Create a burst of particles radiating outward in all directions
 * Used for death effects, explosions, pickups, etc.
 * 
 * @param scene - The Phaser scene to add particles to
 * @param x - X position for the center of the burst
 * @param y - Y position for the center of the burst
 * @param config - Optional configuration for particle appearance and behavior
 * 
 * @example
 * ```typescript
 * // Simple death burst
 * createParticleBurst(this, enemy.x, enemy.y);
 * 
 * // Custom colored explosion
 * createParticleBurst(this, x, y, {
 *   particleCount: 12,
 *   colors: [0xff0000, 0xff9800, 0xffeb3b],
 *   distance: 30,
 *   duration: 600
 * });
 * 
 * // Circular particles
 * createParticleBurst(this, x, y, {
 *   shape: 'circle',
 *   size: 4,
 *   colors: [0x00ff00]
 * });
 * ```
 */
export function createParticleBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: ParticleBurstConfig = {}
): void {
  // Merge with defaults
  const merged = { ...DEFAULT_PARTICLE_BURST, ...config };
  
  for (let i = 0; i < merged.particleCount; i++) {
    const angle = (Math.PI * 2 / merged.particleCount) * i;
    const color = merged.colors[Math.floor(Math.random() * merged.colors.length)];
    
    // Calculate size with variation
    const size = merged.size + (Math.random() - 0.5) * merged.sizeVariation * 2;
    
    // Create particle
    let particle: Phaser.GameObjects.GameObject;
    if (merged.shape === 'circle') {
      const graphics = scene.add.graphics();
      graphics.fillStyle(color, 1);
      graphics.fillCircle(x, y, size);
      graphics.setDepth(merged.depth);
      particle = graphics;
    } else {
      const rect = scene.add.rectangle(x, y, size, size, color, 1);
      rect.setDepth(merged.depth);
      particle = rect;
    }
    
    // Calculate target position
    const distance = merged.distance + Math.random() * (merged.distance * 0.5);
    const targetX = x + Math.cos(angle) * distance;
    const targetY = y + Math.sin(angle) * distance;
    
    // Animate particle bursting outward and fading
    scene.tweens.add({
      targets: particle,
      x: targetX,
      y: targetY,
      alpha: 0,
      duration: merged.duration + Math.random() * 200,
      ease: merged.ease,
      onComplete: () => {
        particle.destroy();
      },
    });
  }
}

/**
 * Create stars animation above a character's head (used for dizzy/stunned effects)
 * 
 * @param scene - The Phaser scene to add stars to
 * @param x - X position (center)
 * @param y - Y position (above character's head)
 * @param config - Optional configuration
 * 
 * @example
 * ```typescript
 * // Show dizzy stars above player
 * createDizzyStars(this, player.x, player.y - 20);
 * ```
 */
export function createDizzyStars(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: {
    starCount?: number;
    spacing?: number;
    duration?: number;
    distance?: number;
  } = {}
): Phaser.GameObjects.Text[] {
  const {
    starCount = 3,
    spacing = 12,
    duration = 4000,
    distance = 15,
  } = config;
  
  const stars = ["✦", "✧", "★"];
  const starObjects: Phaser.GameObjects.Text[] = [];
  
  for (let i = 0; i < starCount; i++) {
    const star = scene.add.text(
      x + (i - (starCount - 1) / 2) * spacing,
      y,
      stars[i % stars.length],
      {
        fontSize: "16px",
        color: "#ffeb3b",
        resolution: 1,
      }
    ).setOrigin(0.5);
    
    starObjects.push(star);
    
    // Animate stars spinning and fading
    scene.tweens.add({
      targets: star,
      angle: 360,
      y: y - distance,
      alpha: 0,
      duration: duration,
      ease: "Power2",
      onComplete: () => star.destroy(),
    });
  }
  
  return starObjects;
}

/**
 * Create a simple glow effect that pulses
 * 
 * @param scene - The Phaser scene
 * @param x - X position
 * @param y - Y position
 * @param config - Configuration for glow
 * @returns The created graphics object
 * 
 * @example
 * ```typescript
 * // Glowing collectible
 * createGlowEffect(this, item.x, item.y, {
 *   color: 0xffff00,
 *   radius: 20,
 *   alpha: 0.4
 * });
 * ```
 */
export function createGlowEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: {
    color?: number;
    radius?: number;
    alpha?: number;
    duration?: number;
    depth?: number;
  } = {}
): Phaser.GameObjects.Graphics {
  const {
    color = 0xffd700,
    radius = 20,
    alpha = 0.4,
    duration = 1000,
    depth = 19,
  } = config;
  
  const glow = scene.add.graphics();
  glow.fillStyle(color, alpha);
  glow.fillCircle(x, y, radius);
  glow.setDepth(depth);
  
  // Pulsing animation
  scene.tweens.add({
    targets: glow,
    alpha: 0,
    duration: duration,
    repeat: -1,
    yoyo: true,
    ease: "Sine.easeInOut",
  });
  
  return glow;
}

