import Phaser from "phaser";

/**
 * UI Animation Utilities
 * Centralized functions for animating UI elements like counters, health bars, etc.
 * Provides consistent visual feedback for UI updates
 */

/**
 * Configuration for counter update animations
 */
export interface CounterAnimationConfig {
  scaleTo?: number;
  scaleDuration?: number;
  flashColor?: string;
  flashDuration?: number;
  addSparkles?: boolean;
  sparkleCount?: number;
  addGlow?: boolean;
  glowScale?: number;
  glowDuration?: number;
  ease?: string;
}

/**
 * Default configuration for counter animations
 */
const DEFAULT_COUNTER_ANIMATION: Required<CounterAnimationConfig> = {
  scaleTo: 1.5,
  scaleDuration: 400,
  flashColor: "#ffffff",
  flashDuration: 400,
  addSparkles: true,
  sparkleCount: 3,
  addGlow: true,
  glowScale: 2,
  glowDuration: 1500,
  ease: "Back.easeOut",
};

/**
 * Animate a counter/stat text when it updates
 * Creates a polished effect with scale pulse, color flash, glow, and sparkles
 * 
 * @param scene - The Phaser scene
 * @param textObject - The text object to animate
 * @param config - Optional configuration for the animation
 * 
 * @example
 * ```typescript
 * // Update score counter
 * this.scoreText.setText(`Score: ${score}`);
 * animateCounterUpdate(this, this.scoreText);
 * 
 * // Custom animation for health loss
 * animateCounterUpdate(this, this.healthText, {
 *   flashColor: "#ff0000",
 *   addSparkles: false,
 *   scaleTo: 1.3
 * });
 * 
 * // Minimal animation (no sparkles/glow)
 * animateCounterUpdate(this, this.counterText, {
 *   addSparkles: false,
 *   addGlow: false
 * });
 * ```
 */
export function animateCounterUpdate(
  scene: Phaser.Scene,
  textObject: Phaser.GameObjects.Text,
  config: CounterAnimationConfig = {}
): void {
  // Merge with defaults
  const merged = { ...DEFAULT_COUNTER_ANIMATION, ...config };
  
  // Store original color
  const originalColor = textObject.style.color;
  
  // Scale pulse animation
  scene.tweens.add({
    targets: textObject,
    scale: merged.scaleTo,
    duration: merged.scaleDuration,
    yoyo: true,
    repeat: 0,
    ease: merged.ease,
  });
  
  // Color flash
  textObject.setColor(merged.flashColor);
  scene.time.delayedCall(merged.flashDuration, () => {
    textObject.setColor(originalColor);
  });
  
  // Glow effect
  if (merged.addGlow) {
    const glowText = scene.add.text(
      textObject.x,
      textObject.y,
      textObject.text,
      {
        ...textObject.style,
        fontStyle: "bold",
      }
    );
    glowText.setOrigin(textObject.originX, textObject.originY);
    glowText.setDepth(textObject.depth - 1);
    
    scene.tweens.add({
      targets: glowText,
      scale: merged.glowScale,
      alpha: 0,
      duration: merged.glowDuration,
      ease: "Power2",
      onComplete: () => glowText.destroy(),
    });
  }
  
  // Sparkle particles
  if (merged.addSparkles) {
    for (let i = 0; i < merged.sparkleCount; i++) {
      const sparkle = scene.add.text(
        textObject.x + (Math.random() - 0.5) * 20,
        textObject.y + (Math.random() - 0.5) * 10,
        "✨",
        {
          fontSize: "12px",
          resolution: 1,
        }
      );
      sparkle.setOrigin(0.5);
      sparkle.setDepth(textObject.depth + 1);
      
      scene.tweens.add({
        targets: sparkle,
        y: sparkle.y - 20,
        alpha: 0,
        duration: 1000,
        delay: i * 200,
        ease: "Power2",
        onComplete: () => sparkle.destroy(),
      });
    }
  }
}

/**
 * Create a simple pulse animation for UI elements
 * Good for drawing attention to buttons, prompts, etc.
 * 
 * @param scene - The Phaser scene
 * @param target - The game object to pulse
 * @param config - Configuration for pulse animation
 * @returns The tween object (can be stopped with tween.stop())
 * 
 * @example
 * ```typescript
 * // Pulse a button continuously
 * createPulseAnimation(this, this.playButton);
 * 
 * // Custom pulse
 * const tween = createPulseAnimation(this, this.prompt, {
 *   scaleTo: 1.2,
 *   duration: 800
 * });
 * 
 * // Stop it later
 * tween.stop();
 * ```
 */
export function createPulseAnimation(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  config: {
    scaleTo?: number;
    duration?: number;
    ease?: string;
  } = {}
): Phaser.Tweens.Tween {
  const {
    scaleTo = 1.1,
    duration = 600,
    ease = "Sine.easeInOut",
  } = config;
  
  return scene.tweens.add({
    targets: target,
    scale: scaleTo,
    duration: duration,
    yoyo: true,
    repeat: -1,
    ease: ease,
  });
}

/**
 * Shake a UI element (good for errors, damage, etc.)
 * 
 * @param scene - The Phaser scene
 * @param target - The game object to shake
 * @param config - Configuration for shake animation
 * 
 * @example
 * ```typescript
 * // Shake health bar when taking damage
 * shakeUIElement(this, this.healthBar);
 * 
 * // Intense shake for critical error
 * shakeUIElement(this, this.errorText, {
 *   intensity: 10,
 *   duration: 400
 * });
 * ```
 */
export function shakeUIElement(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { x: number; y: number },
  config: {
    intensity?: number;
    duration?: number;
  } = {}
): void {
  const {
    intensity = 5,
    duration = 200,
  } = config;
  
  const originalX = target.x;
  
  scene.tweens.add({
    targets: target,
    x: originalX + intensity,
    duration: duration / 4,
    yoyo: true,
    repeat: 3,
    ease: "Power2",
    onComplete: () => {
      target.x = originalX;
    },
  });
}

/**
 * Create a bounce-in animation for UI elements appearing
 * 
 * @param scene - The Phaser scene
 * @param target - The game object to animate in
 * @param config - Configuration for animation
 * 
 * @example
 * ```typescript
 * // Bounce in a menu
 * createBounceIn(this, this.menu);
 * 
 * // Custom bounce with delay
 * createBounceIn(this, this.message, {
 *   delay: 500,
 *   duration: 400
 * });
 * ```
 */
export function createBounceIn(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  config: {
    delay?: number;
    duration?: number;
    startScale?: number;
  } = {}
): void {
  const {
    delay = 0,
    duration = 500,
    startScale = 0,
  } = config;
  
  // Set to small scale initially
  (target as any).setScale(startScale);
  
  scene.tweens.add({
    targets: target,
    scale: 1,
    duration: duration,
    delay: delay,
    ease: "Back.easeOut",
  });
}

/**
 * Create a fade-in animation for UI elements
 * 
 * @param scene - The Phaser scene
 * @param target - The game object to fade in
 * @param config - Configuration for animation
 * 
 * @example
 * ```typescript
 * // Fade in dialogue
 * createFadeIn(this, this.dialogueBox);
 * ```
 */
export function createFadeIn(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  config: {
    delay?: number;
    duration?: number;
    startAlpha?: number;
  } = {}
): void {
  const {
    delay = 0,
    duration = 600,
    startAlpha = 0,
  } = config;
  
  (target as any).setAlpha(startAlpha);
  
  scene.tweens.add({
    targets: target,
    alpha: 1,
    duration: duration,
    delay: delay,
    ease: "Power2",
  });
}

/**
 * Create a fade-out animation for UI elements
 * 
 * @param scene - The Phaser scene
 * @param target - The game object to fade out
 * @param config - Configuration for animation
 * @param onComplete - Optional callback when animation completes
 * 
 * @example
 * ```typescript
 * // Fade out and destroy
 * createFadeOut(this, this.message, {}, () => {
 *   this.message.destroy();
 * });
 * ```
 */
export function createFadeOut(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  config: {
    delay?: number;
    duration?: number;
  } = {},
  onComplete?: () => void
): void {
  const {
    delay = 0,
    duration = 600,
  } = config;
  
  scene.tweens.add({
    targets: target,
    alpha: 0,
    duration: duration,
    delay: delay,
    ease: "Power2",
    onComplete: onComplete,
  });
}

/**
 * Create a typewriter effect for text
 * Text appears one character at a time
 * 
 * @param scene - The Phaser scene
 * @param textObject - The text object to animate
 * @param fullText - The full text to display
 * @param config - Configuration for typewriter effect
 * 
 * @example
 * ```typescript
 * createTypewriterEffect(this, this.dialogueText, "Hello, world!");
 * 
 * // Faster typing
 * createTypewriterEffect(this, this.text, message, {
 *   speed: 30
 * });
 * ```
 */
export function createTypewriterEffect(
  scene: Phaser.Scene,
  textObject: Phaser.GameObjects.Text,
  fullText: string,
  config: {
    speed?: number;
    onComplete?: () => void;
  } = {}
): void {
  const {
    speed = 50,
    onComplete,
  } = config;
  
  let currentIndex = 0;
  textObject.setText("");
  
  const timer = scene.time.addEvent({
    delay: speed,
    repeat: fullText.length - 1,
    callback: () => {
      textObject.setText(fullText.substring(0, currentIndex + 1));
      currentIndex++;
      
      if (currentIndex >= fullText.length && onComplete) {
        onComplete();
      }
    },
  });
}

