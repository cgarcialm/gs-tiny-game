import Phaser from "phaser";
import type { GameControls } from "./controls";
import { HelpMenu } from "./helpMenu";
import { PauseMenu } from "./pauseMenu";
import type { CheatConsole } from "./cheatConsole";

/**
 * Handle menu input (pause menu and help menu) for a scene
 * This centralizes the common pattern of handling ESC and H keys
 * 
 * @param scene - The current Phaser scene
 * @param controls - The game controls object
 * @param helpMenu - The help menu instance
 * @param pauseMenu - The pause menu instance
 * @param onExitToTitle - Optional callback when player chooses to exit to title
 * @param cheatConsole - Optional cheat console instance to check if it's open
 * @returns true if menus are active (block game input), false if game should process input
 */
export function handleMenuInput(
  scene: Phaser.Scene,
  controls: GameControls,
  helpMenu: HelpMenu,
  pauseMenu: PauseMenu,
  onExitToTitle?: () => void,
  cheatConsole?: CheatConsole
): boolean {
  // If cheat console is open, block all game input
  if (cheatConsole?.consoleOpen) {
    return true;
  }
  
  // Handle pause menu toggle (ESC key)
  if (Phaser.Input.Keyboard.JustDown(controls.escape)) {
    pauseMenu.toggle();
  }
  
  // If pause menu is open, handle exit to title
  if (pauseMenu.isVisible()) {
    if (Phaser.Input.Keyboard.JustDown(controls.advance)) {
      // Exit to title screen
      pauseMenu.hide();
      
      if (onExitToTitle) {
        onExitToTitle();
      } else {
        // Default behavior: restart Title scene
        scene.scene.start("Title");
      }
    }
    return true; // Block game input
  }

  // Handle help menu toggle (H key)
  if (Phaser.Input.Keyboard.JustDown(controls.help)) {
    helpMenu.toggle();
  }
  
  // If help menu is open, block game input
  if (helpMenu.isVisible()) {
    return true; // Block game input
  }
  
  return false; // Menus closed, allow game input
}

