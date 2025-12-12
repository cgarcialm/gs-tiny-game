import { SCENES, type SceneName } from "./sceneConstants";

/**
 * Debug configuration for testing
 * Change these values to skip to different parts of the game
 * 
 * NOTE: These are ONLY for development/debugging.
 * Production builds ignore these and always start at "Title" scene.
 */

/**
 * Scene to start from (for testing)
 * "Title" = Normal game start (default)
 * "Game" = Skip directly to void/GameScene
 * "Northgate" = Skip to Northgate Station
 * "IceHockey" = Skip to Ice Hockey scene
 * "SeattleTraffic" = Skip to Seattle Traffic scene
 * "FarmersMarket" = Skip to Farmers Market Pac-Man scene
 * "Camping" = Skip to Camping scene
 */
export const DEBUG_START_SCENE: SceneName = SCENES.SEATTLE_TRAFFIC;

/**
 * Set to desired level number to skip ahead in GameScene (only applies if starting in "Game")
 * 0 = start (Eboshi encounter)
 * 1 = after Northgate (Ceci returns)
 * 2 = after Ice Hockey (Seattle Traffic intro)
 * 3 = after Seattle Traffic (Smush playing)
 * 4 = after Farmers Market (final memory complete)
 * 
 * NOTE: This only applies when there's NO registry value (fresh start).
 * Registry values from completed levels always take priority.
 */
export const DEBUG_START_LEVEL = 2;

/**
 * Show debug grid and axes in 3D camping scene
 * true = Show coordinate axes and grid (for positioning)
 * false = Hide debug visualizations (clean view)
 */
export const DEBUG_SHOW_GRID = false;

/**
 * Show Smush AI debugging in Farmers Market
 * true = Show magenta line to target, console logs
 * false = Clean gameplay (no visual debugging)
 */
export const DEBUG_SHOW_SMUSH_AI = false;
