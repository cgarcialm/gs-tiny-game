import Phaser from "phaser";

/**
 * Collection & Proximity Utilities
 * Centralized functions for detecting proximity and handling collection mechanics
 * Reduces code duplication across scenes and provides consistent interaction ranges
 */

/**
 * Object with position properties
 */
export interface Positioned {
  x: number;
  y: number;
}

/**
 * Check if two positioned objects are within a certain distance
 * 
 * @param obj1 - First object with x, y properties
 * @param obj2 - Second object with x, y properties
 * @param threshold - Distance threshold for proximity
 * @returns True if objects are within threshold distance
 * 
 * @example
 * ```typescript
 * if (checkProximity(player, npc, 50)) {
 *   // Player is near NPC
 * }
 * ```
 */
export function checkProximity(
  obj1: Positioned,
  obj2: Positioned,
  threshold: number
): boolean {
  const distance = Phaser.Math.Distance.Between(obj1.x, obj1.y, obj2.x, obj2.y);
  return distance < threshold;
}

/**
 * Get the distance between two positioned objects
 * 
 * @param obj1 - First object with x, y properties
 * @param obj2 - Second object with x, y properties
 * @returns Distance between the two objects
 * 
 * @example
 * ```typescript
 * const dist = getDistance(player, enemy);
 * if (dist < 20) {
 *   // Close range attack
 * } else if (dist < 100) {
 *   // Long range attack
 * }
 * ```
 */
export function getDistance(obj1: Positioned, obj2: Positioned): number {
  return Phaser.Math.Distance.Between(obj1.x, obj1.y, obj2.x, obj2.y);
}

/**
 * Find the nearest object from a list of targets
 * 
 * @param source - Source object with x, y properties
 * @param targets - Array of target objects with x, y properties
 * @param filterFn - Optional filter function to exclude certain targets
 * @returns The nearest target object, or null if no valid targets
 * 
 * @example
 * ```typescript
 * // Find nearest uncollected pie
 * const nearestPie = findNearestTarget(smush, pies, (pie) => !pie.getData('collected'));
 * 
 * // Find nearest active enemy
 * const nearestEnemy = findNearestTarget(player, enemies, (e) => e.active);
 * ```
 */
export function findNearestTarget<T extends Positioned>(
  source: Positioned,
  targets: T[],
  filterFn?: (target: T) => boolean
): T | null {
  let nearest: T | null = null;
  let nearestDistance = Infinity;
  
  targets.forEach((target) => {
    // Apply filter if provided
    if (filterFn && !filterFn(target)) {
      return;
    }
    
    const distance = getDistance(source, target);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = target;
    }
  });
  
  return nearest;
}

/**
 * Configuration for proximity triggers
 */
export interface ProximityTriggerConfig {
  threshold: number;
  onEnter?: () => void;
  onExit?: () => void;
  onStay?: () => void;
  enabled?: boolean;
}

/**
 * A reusable proximity trigger that tracks when objects enter/exit range
 * Useful for interaction prompts, automatic collection, etc.
 */
export class ProximityTrigger {
  private source: Positioned;
  private target: Positioned;
  private config: Required<ProximityTriggerConfig>;
  private wasInRange: boolean = false;
  
  constructor(
    source: Positioned,
    target: Positioned,
    config: ProximityTriggerConfig
  ) {
    this.source = source;
    this.target = target;
    this.config = {
      threshold: config.threshold,
      onEnter: config.onEnter || (() => {}),
      onExit: config.onExit || (() => {}),
      onStay: config.onStay || (() => {}),
      enabled: config.enabled ?? true,
    };
  }
  
  /**
   * Update the trigger - call this every frame
   */
  update(): void {
    if (!this.config.enabled) return;
    
    const inRange = checkProximity(this.source, this.target, this.config.threshold);
    
    if (inRange && !this.wasInRange) {
      // Just entered range
      this.config.onEnter();
    } else if (!inRange && this.wasInRange) {
      // Just exited range
      this.config.onExit();
    } else if (inRange && this.wasInRange) {
      // Staying in range
      this.config.onStay();
    }
    
    this.wasInRange = inRange;
  }
  
  /**
   * Check if currently in range
   */
  isInRange(): boolean {
    return checkProximity(this.source, this.target, this.config.threshold);
  }
  
  /**
   * Enable or disable the trigger
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
  
  /**
   * Update the threshold distance
   */
  setThreshold(threshold: number): void {
    this.config.threshold = threshold;
  }
}

/**
 * Check collision between multiple objects and a single target
 * Returns all objects that are within threshold distance
 * 
 * @param target - Target object to check against
 * @param objects - Array of objects to check
 * @param threshold - Distance threshold
 * @param filterFn - Optional filter function
 * @returns Array of objects within range
 * 
 * @example
 * ```typescript
 * // Check which pies the player can collect
 * const collectiblePies = checkMultipleProximity(
 *   player,
 *   pies,
 *   12,
 *   (pie) => !pie.getData('collected')
 * );
 * 
 * collectiblePies.forEach(pie => collectPie(pie));
 * ```
 */
export function checkMultipleProximity<T extends Positioned>(
  target: Positioned,
  objects: T[],
  threshold: number,
  filterFn?: (obj: T) => boolean
): T[] {
  const inRange: T[] = [];
  
  objects.forEach((obj) => {
    if (filterFn && !filterFn(obj)) {
      return;
    }
    
    if (checkProximity(target, obj, threshold)) {
      inRange.push(obj);
    }
  });
  
  return inRange;
}

/**
 * Create a simple interaction prompt that shows/hides based on proximity
 * 
 * @param scene - The Phaser scene
 * @param promptText - The text object to show/hide
 * @param player - Player object
 * @param target - Target object to check proximity to
 * @param threshold - Distance threshold
 * @param offsetY - Y offset for prompt position (default: -14)
 * 
 * @example
 * ```typescript
 * // In update loop
 * updateInteractionPrompt(this, this.promptText, this.player, this.npc, 50);
 * ```
 */
export function updateInteractionPrompt(
  scene: Phaser.Scene,
  promptText: Phaser.GameObjects.Text,
  player: Positioned,
  target: Positioned,
  threshold: number,
  offsetY: number = -14
): boolean {
  const inRange = checkProximity(player, target, threshold);
  
  if (inRange) {
    promptText.setVisible(true);
    promptText.setPosition(target.x, target.y + offsetY);
  } else {
    promptText.setVisible(false);
  }
  
  return inRange;
}

/**
 * Normalize a 2D vector (useful for movement toward a target)
 * 
 * @param vx - X component of vector
 * @param vy - Y component of vector
 * @returns Normalized vector {x, y} with length 1, or {x: 0, y: 0} if zero vector
 * 
 * @example
 * ```typescript
 * const dx = target.x - enemy.x;
 * const dy = target.y - enemy.y;
 * const normalized = normalizeVector(dx, dy);
 * enemy.setVelocity(normalized.x * speed, normalized.y * speed);
 * ```
 */
export function normalizeVector(vx: number, vy: number): { x: number; y: number } {
  const length = Math.sqrt(vx * vx + vy * vy);
  
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: vx / length,
    y: vy / length,
  };
}

/**
 * Get direction vector from source to target
 * 
 * @param source - Source position
 * @param target - Target position
 * @param normalize - Whether to normalize the vector (default: true)
 * @returns Direction vector {x, y}
 * 
 * @example
 * ```typescript
 * const direction = getDirectionVector(enemy, player);
 * enemy.x += direction.x * speed * dt;
 * enemy.y += direction.y * speed * dt;
 * ```
 */
export function getDirectionVector(
  source: Positioned,
  target: Positioned,
  normalize: boolean = true
): { x: number; y: number } {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  
  if (normalize) {
    return normalizeVector(dx, dy);
  }
  
  return { x: dx, y: dy };
}

