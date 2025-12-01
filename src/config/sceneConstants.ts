/**
 * Centralized constants for scene names and game progression
 * 
 * This provides:
 * - Type safety for scene names (no typos!)
 * - Single source of truth for level numbers
 * - Easy to refactor/rename scenes
 */

/**
 * Scene name constants
 * Use these instead of hardcoded strings when calling scene.start(), scene.launch(), etc.
 */
export const SCENES = {
  BOOT: 'Boot',
  TITLE: 'Title',
  GAME: 'Game', // Main void scene (level hub)
  NORTHGATE: 'Northgate',
  ICE_HOCKEY: 'IceHockey',
  SEATTLE_TRAFFIC: 'SeattleTraffic',
  FARMERS_MARKET: 'FarmersMarket',
  VOID_3D: 'Void3D',
  CAMPING: 'Camping',
} as const;

/**
 * Level progression constants
 * These correspond to the 'completedLevels' value in game state
 */
export const VOID_LEVELS = {
  EBOSHI_ENCOUNTER: 0,      // First time in void - meet Eboshi
  AFTER_NORTHGATE: 1,       // Ceci returns with memory
  AFTER_ICE_HOCKEY: 2,      // Seattle Traffic intro
  AFTER_SEATTLE_TRAFFIC: 3, // Smush playing with memories
  AFTER_FARMERS_MARKET: 4,  // Final memory, card shuffle game
  COMPLETE: 5,              // All void levels done, ready for 3D transition
} as const;

/**
 * Helper type for type-safe scene names
 */
export type SceneName = typeof SCENES[keyof typeof SCENES];

/**
 * Helper type for void level numbers
 */
export type VoidLevel = typeof VOID_LEVELS[keyof typeof VOID_LEVELS];

/**
 * Get a human-readable description of a void level
 */
export function getVoidLevelDescription(level: number): string {
  switch (level) {
    case VOID_LEVELS.EBOSHI_ENCOUNTER:
      return 'Eboshi Encounter';
    case VOID_LEVELS.AFTER_NORTHGATE:
      return 'After Northgate (Ceci Returns)';
    case VOID_LEVELS.AFTER_ICE_HOCKEY:
      return 'After Ice Hockey (Seattle Traffic Intro)';
    case VOID_LEVELS.AFTER_SEATTLE_TRAFFIC:
      return 'After Seattle Traffic (Smush Playing)';
    case VOID_LEVELS.AFTER_FARMERS_MARKET:
      return 'After Farmers Market (Card Shuffle)';
    case VOID_LEVELS.COMPLETE:
      return 'Void Complete';
    default:
      return `Unknown Level ${level}`;
  }
}

/**
 * Memory collection constants
 * Tracks which memories have been collected at each level
 */
export const MEMORY_COUNT = {
  NONE: 0,
  EBOSHI: 1,    // After Eboshi encounter
  CECI: 2,      // After Ceci gives memory
  SMUSH: 3,     // After Smush memory
  SHUFFLE: 4,   // After card shuffle game
} as const;

/**
 * Get memory count for a given completed level
 */
export function getMemoryCountForLevel(completedLevel: number): number {
  if (completedLevel === 0) return MEMORY_COUNT.NONE;
  if (completedLevel === 1) return MEMORY_COUNT.EBOSHI;
  if (completedLevel === 2) return MEMORY_COUNT.CECI;
  if (completedLevel === 3) return MEMORY_COUNT.CECI; // Seattle Traffic has no memory
  return MEMORY_COUNT.SMUSH; // Level 4+ has all 3
}

