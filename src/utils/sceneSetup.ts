import Phaser from "phaser";
import { setupControls, type GameControls } from "./controls";
import { HelpMenu } from "./helpMenu";
import { PauseMenu } from "./pauseMenu";
import { DialogueManager } from "./dialogueManager";

/**
 * Common objects initialized for a game scene
 */
export interface SceneSetup {
  controls: GameControls;
  helpMenu: HelpMenu;
  pauseMenu: PauseMenu;
  dialogueManager: DialogueManager;
}

/**
 * Initialize common game scene elements
 * This reduces boilerplate code that appears in every scene's create() method
 * 
 * Sets up:
 * - Camera pixel art settings (rounded pixels)
 * - Game controls (WASD, arrows, space, E, enter, ESC, H)
 * - Help menu (H key)
 * - Pause menu (ESC key)
 * - Dialogue manager
 * 
 * @param scene - The Phaser scene to initialize
 * @returns Object containing all initialized systems
 * 
 * @example
 * ```typescript
 * create() {
 *   const { controls, helpMenu, pauseMenu, dialogueManager } = initializeGameScene(this);
 *   this.controls = controls;
 *   this.helpMenu = helpMenu;
 *   this.pauseMenu = pauseMenu;
 *   this.dialogueManager = dialogueManager;
 *   
 *   // ... rest of scene setup
 * }
 * ```
 */
export function initializeGameScene(scene: Phaser.Scene): SceneSetup {
  // Set camera to respect pixel art settings
  scene.cameras.main.setRoundPixels(true);
  
  // Setup standard controls (WASD + arrows, space, E, Enter, ESC, H)
  const controls = setupControls(scene);
  
  // Create help menu
  const helpMenu = new HelpMenu(scene);
  
  // Create pause menu
  const pauseMenu = new PauseMenu(scene);
  
  // Create dialogue manager
  const dialogueManager = new DialogueManager(scene);
  
  return {
    controls,
    helpMenu,
    pauseMenu,
    dialogueManager,
  };
}

