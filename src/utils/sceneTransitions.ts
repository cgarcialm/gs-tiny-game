import Phaser from "phaser";

/**
 * Centralized scene transition utilities
 * Provides consistent fade transitions and scene switching behavior
 */

/**
 * Fade out to black and transition to a new scene
 * 
 * @param scene - The current scene
 * @param targetScene - The name of the scene to transition to
 * @param duration - Duration of the fade in milliseconds (default: 1000)
 * @param rgb - RGB color to fade to (default: black [0, 0, 0])
 * 
 * @example
 * ```typescript
 * fadeToScene(this, "Title");
 * fadeToScene(this, "Game", 800);
 * fadeToScene(this, "Northgate", 1000, [255, 255, 255]); // Fade to white
 * ```
 */
export function fadeToScene(
  scene: Phaser.Scene,
  targetScene: string,
  duration: number = 1000,
  rgb: [number, number, number] = [0, 0, 0]
): void {
  scene.cameras.main.fadeOut(duration, rgb[0], rgb[1], rgb[2]);
  scene.time.delayedCall(duration, () => {
    scene.scene.start(targetScene);
  });
}

/**
 * Fade in from black when scene starts
 * 
 * @param scene - The current scene
 * @param duration - Duration of the fade in milliseconds (default: 600)
 * @param rgb - RGB color to fade from (default: black [0, 0, 0])
 * 
 * @example
 * ```typescript
 * create() {
 *   fadeIn(this);
 *   // ... rest of scene setup
 * }
 * ```
 */
export function fadeIn(
  scene: Phaser.Scene,
  duration: number = 600,
  rgb: [number, number, number] = [0, 0, 0]
): void {
  scene.cameras.main.fadeIn(duration, rgb[0], rgb[1], rgb[2]);
}

/**
 * Flash effect on camera (useful for damage, pickups, etc.)
 * 
 * @param scene - The current scene
 * @param duration - Duration of the flash in milliseconds (default: 200)
 * @param rgb - RGB color to flash (default: white [255, 255, 255])
 * @param intensity - Intensity of the flash (0-1, default: 0.5)
 * 
 * @example
 * ```typescript
 * flash(this, 200, [255, 0, 0]); // Red flash (damage)
 * flash(this, 300, [255, 255, 0]); // Yellow flash (pickup)
 * ```
 */
export function flash(
  scene: Phaser.Scene,
  duration: number = 200,
  rgb: [number, number, number] = [255, 255, 255],
  intensity: number = 0.5
): void {
  scene.cameras.main.flash(duration, rgb[0], rgb[1], rgb[2], false, undefined, intensity);
}

/**
 * Shake effect on camera (useful for impacts, explosions, etc.)
 * 
 * @param scene - The current scene  
 * @param duration - Duration of the shake in milliseconds (default: 500)
 * @param intensity - Intensity of the shake (default: 0.005)
 * 
 * @example
 * ```typescript
 * shake(this); // Light shake
 * shake(this, 800, 0.01); // Stronger shake
 * ```
 */
export function shake(
  scene: Phaser.Scene,
  duration: number = 500,
  intensity: number = 0.005
): void {
  scene.cameras.main.shake(duration, intensity);
}

