import Phaser from "phaser";
import type { GameControls } from "./controls";
import { HelpMenu } from "./helpMenu";
import { PauseMenu } from "./pauseMenu";
import type { CheatConsole } from "./cheatConsole";
import { GameStateManager } from "../managers/GameStateManager";

// Store mute icon reference per scene
const muteIcons = new WeakMap<Phaser.Scene, Phaser.GameObjects.Graphics>();

/**
 * Create or update the mute indicator icon (pixel art speaker with X)
 * Only visible when music is muted
 */
function updateMuteIcon(scene: Phaser.Scene, gameState: GameStateManager) {
  let icon = muteIcons.get(scene);
  
  // Check if icon was destroyed (scene change) or doesn't exist
  if (!icon || !icon.active) {
    // Create pixel art mute icon
    icon = scene.add.graphics();
    icon.setDepth(1000);
    
    const x = 4, y = 4;
    
    // Semi-transparent dark background
    icon.fillStyle(0x000000, 0.5);
    icon.fillRoundedRect(x - 2, y - 2, 12, 12, 2);
    
    // Draw small speaker with diagonal line through it
    icon.fillStyle(0x888888, 0.9);
    // Speaker body
    icon.fillRect(x, y + 2, 2, 4);
    icon.fillRect(x + 2, y + 1, 2, 6);
    // Speaker cone
    icon.fillRect(x + 4, y, 1, 8);
    // Diagonal cross line through speaker (red)
    icon.fillStyle(0xff4444, 1);
    icon.fillRect(x, y, 1, 1);
    icon.fillRect(x + 1, y + 1, 1, 1);
    icon.fillRect(x + 2, y + 2, 1, 1);
    icon.fillRect(x + 3, y + 3, 1, 1);
    icon.fillRect(x + 3, y + 4, 1, 1);
    icon.fillRect(x + 4, y + 5, 1, 1);
    icon.fillRect(x + 4, y + 6, 1, 1);
    icon.fillRect(x + 5, y + 7, 1, 1);
    
    muteIcons.set(scene, icon);
  }
  
  // Only show when muted
  icon.setVisible(gameState.isMuted());
}

/**
 * Handle menu input (pause menu and help menu) for a scene
 * This centralizes the common pattern of handling ESC, H, and M keys
 * 
 * @param scene - The current Phaser scene
 * @param controls - The game controls object
 * @param helpMenu - The help menu instance
 * @param pauseMenu - The pause menu instance
 * @param onExitToTitle - Optional callback when player chooses to exit to title
 * @param cheatConsole - Optional cheat console instance to check if it's open
 * @param gameState - Optional game state manager for mute functionality
 * @returns true if menus are active (block game input), false if game should process input
 */
export function handleMenuInput(
  scene: Phaser.Scene,
  controls: GameControls,
  helpMenu: HelpMenu,
  pauseMenu: PauseMenu,
  onExitToTitle?: () => void,
  onOpenLeaderboard?: () => void,
  cheatConsole?: CheatConsole,
  gameState?: GameStateManager
): boolean {
  // If cheat console is open, block all game input
  if (cheatConsole?.consoleOpen) {
    return true;
  }
  
  // Handle mute toggle (M key) - works even when menus are open
  if (gameState && Phaser.Input.Keyboard.JustDown(controls.mute)) {
    gameState.toggleMute();
    updateMuteIcon(scene, gameState);
  }
  
  // Update mute icon visibility (in case state changed elsewhere)
  if (gameState) {
    updateMuteIcon(scene, gameState);
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

  // Handle leaderboard screen (L key)
  if (Phaser.Input.Keyboard.JustDown(controls.leaderboard)) {
    if (helpMenu.isVisible()) {
      helpMenu.hide();
    }
    if (pauseMenu.isVisible()) {
      pauseMenu.hide();
    }
    if (onOpenLeaderboard) {
      onOpenLeaderboard();
      return true;
    }
  }
  
  // If help menu is open, block game input
  if (helpMenu.isVisible()) {
    return true; // Block game input
  }
  
  return false; // Menus closed, allow game input
}
