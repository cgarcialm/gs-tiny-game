/**
 * Centralized game state management
 * 
 * This class wraps Phaser's registry and provides a clean, type-safe API
 * for managing global game state. All registry access should go through this class.
 * 
 * Benefits:
 * - Single source of truth for game state
 * - Type safety
 * - Logging and debugging
 * - Easy to add validation
 * - Clear API that documents what state exists
 */
export class GameStateManager {
  private registry: Phaser.Data.DataManager;
  private debugMode: boolean;

  constructor(registry: Phaser.Data.DataManager, debugMode: boolean = false) {
    this.registry = registry;
    this.debugMode = debugMode;
    this.log('GameStateManager initialized');
  }

  // ============================================================================
  // LEVEL PROGRESSION
  // ============================================================================

  /**
   * Get the number of completed levels (0-4)
   * 0 = No levels complete (start at Eboshi encounter)
   * 1 = Completed Northgate
   * 2 = Completed Ice Hockey
   * 3 = Completed Seattle Traffic
   * 4 = Completed Farmers Market
   */
  getCompletedLevels(): number {
    const level = this.registry.get('completedLevels');
    return level !== undefined && level !== null ? level : 0;
  }

  /**
   * Set completed levels (always takes maximum to prevent going backwards)
   * @param level - The level number (0-4)
   * @param force - If true, allows setting to a lower level (for debugging/cheats)
   */
  setCompletedLevels(level: number, force: boolean = false): void {
    const current = this.getCompletedLevels();
    const newLevel = force ? level : Math.max(current, level);
    
    if (newLevel !== current) {
      this.registry.set('completedLevels', newLevel);
      this.log(`Completed levels: ${current} -> ${newLevel}${force ? ' (forced)' : ''}`);
    }
  }

  /**
   * Mark a specific level as complete (increments from current)
   */
  completeLevel(levelNumber: number): void {
    this.setCompletedLevels(levelNumber);
  }

  // ============================================================================
  // MUSIC MANAGEMENT
  // ============================================================================

  /**
   * Get the currently playing music track
   */
  getCurrentMusic(): Phaser.Sound.BaseSound | null {
    return this.registry.get('currentMusic') ?? null;
  }

  /**
   * Set the current music track (stops previous music if different)
   * @param music - The music sound object or null to clear
   */
  setCurrentMusic(music: Phaser.Sound.BaseSound | null): void {
    const current = this.getCurrentMusic();
    
    // Stop current music if it's different and still playing
    if (current && current !== music) {
      if (current.isPlaying) {
        current.stop();
        this.log('Stopped previous music');
      }
    }
    
    this.registry.set('currentMusic', music);
    
    if (music) {
      this.log(`Current music set: ${(music as any).key || 'unknown'}`);
    } else {
      this.log('Current music cleared');
    }
  }

  /**
   * Stop current music and clear the reference
   */
  stopMusic(): void {
    const music = this.getCurrentMusic();
    if (music && music.isPlaying) {
      music.stop();
      this.log('Music stopped');
    }
    this.registry.set('currentMusic', null);
  }

  // ============================================================================
  // UI / HELP SYSTEM
  // ============================================================================

  /**
   * Check if the help hint has been unlocked (shown after Eboshi interaction)
   */
  isHelpHintUnlocked(): boolean {
    return this.registry.get('showHelpHint') ?? false;
  }

  /**
   * Unlock the help hint (shows "H for Help" in bottom right)
   */
  unlockHelpHint(): void {
    if (!this.isHelpHintUnlocked()) {
      this.registry.set('showHelpHint', true);
      this.log('Help hint unlocked');
    }
  }

  // ============================================================================
  // SCENE TRANSITION FLAGS
  // ============================================================================

  /**
   * Check if transitioning from Title scene (and auto-clear the flag)
   * This flag is used to differentiate between:
   * - Starting a new game from Title (should start at level 0)
   * - Using debug mode to jump to a level
   */
  isFromTitleScene(): boolean {
    const flag = this.registry.get('fromTitleScene') ?? false;
    
    // Auto-clear the flag after reading it (one-time use)
    if (flag) {
      this.registry.set('fromTitleScene', false);
      this.log('fromTitleScene flag cleared');
    }
    
    return flag;
  }

  /**
   * Mark that we're transitioning from the Title scene
   * (Used when starting a new game via Title intro)
   */
  markFromTitleScene(): void {
    this.registry.set('fromTitleScene', true);
    this.log('Marked as from Title scene');
  }

  // ============================================================================
  // GAME STATE MANAGEMENT
  // ============================================================================

  /**
   * Reset all progress (new game)
   * Clears:
   * - Completed levels
   * - Music
   * - Help hint
   * - Scene transition flags
   */
  resetProgress(): void {
    this.log('Resetting all progress...');
    
    // Stop music
    this.stopMusic();
    
    // Reset all flags
    this.registry.set('completedLevels', 0);
    this.registry.set('fromTitleScene', false);
    this.registry.set('showHelpHint', false);
    
    this.log('Progress reset complete');
  }

  /**
   * Get a snapshot of current game state (for debugging)
   */
  getStateSnapshot(): {
    completedLevels: number;
    hasMusic: boolean;
    helpHintUnlocked: boolean;
    fromTitleScene: boolean;
  } {
    return {
      completedLevels: this.getCompletedLevels(),
      hasMusic: this.getCurrentMusic() !== null,
      helpHintUnlocked: this.isHelpHintUnlocked(),
      fromTitleScene: this.registry.get('fromTitleScene') ?? false,
    };
  }

  /**
   * Log state changes (only in debug mode)
   */
  private log(message: string): void {
    if (this.debugMode) {
      console.log(`[GameState] ${message}`);
    }
  }

  // ============================================================================
  // DIRECT REGISTRY ACCESS (Use sparingly!)
  // ============================================================================

  /**
   * Get a raw value from the registry
   * Only use this for custom values not covered by the API above
   */
  getRaw<T = any>(key: string): T | undefined {
    return this.registry.get(key);
  }

  /**
   * Set a raw value in the registry
   * Only use this for custom values not covered by the API above
   */
  setRaw<T = any>(key: string, value: T): void {
    this.registry.set(key, value);
  }
}

