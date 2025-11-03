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
 * "FarmersMarket" = Skip to Farmers Market Pac-Man scene
 */
export const DEBUG_START_SCENE: "Title" | "Game" | "Northgate" | "IceHockey" | "FarmersMarket" = "FarmersMarket";

/**
 * Set to desired level number to skip ahead in GameScene (only applies if starting in "Game")
 * 0 = start (Eboshi encounter) - RECOMMENDED for normal play
 * 1 = after Northgate (Ceci returns)
 * 2 = after Ice Hockey (Smush playing)
 * 3 = after Farmers Market
 * 
 * NOTE: This only applies when there's NO registry value (fresh start).
 * Registry values from completed levels always take priority.
 */
export const DEBUG_START_LEVEL = 0;

