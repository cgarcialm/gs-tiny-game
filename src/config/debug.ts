/**
 * Debug configuration for testing
 * Change these values to skip to different parts of the game
 */

/**
 * Scene to start from (for testing)
 * "Title" = Normal game start (default)
 * "Game" = Skip directly to void/GameScene
 * "Northgate" = Skip to Northgate Station
 * "IceHockey" = Skip to Ice Hockey scene
 */
export const DEBUG_START_SCENE: "Title" | "Game" | "Northgate" | "IceHockey" = "Game";

/**
 * Set to desired level number to skip ahead in GameScene (only applies if starting in "Game")
 * 0 = start (Eboshi encounter)
 * 1 = after Northgate (Ceci returns)
 * 2 = after level 2
 * etc.
 */
export const DEBUG_START_LEVEL = 2;

