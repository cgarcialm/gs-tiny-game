import Phaser from "phaser";

/**
 * Global UI positions for consistency across scenes
 */
export const HELP_HINT_X = 318;
export const HELP_HINT_Y = 180;

export interface GameControls {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  advance: Phaser.Input.Keyboard.Key;
  escape: Phaser.Input.Keyboard.Key;
  help: Phaser.Input.Keyboard.Key;
}

/**
 * Setup standard game controls for a scene
 * All scenes will have consistent input handling:
 * - A/D + Left/Right arrows for horizontal movement
 * - W/S + Up/Down arrows for vertical movement
 * - Space for jump/advance
 * - E for interact
 * - Enter for advance dialogue
 * - ESC for escape/cancel
 * - H for help menu
 */
export function setupControls(scene: Phaser.Scene): GameControls {
  const keyboard = scene.input.keyboard!;
  
  // Create cursor keys (arrow keys)
  const cursors = keyboard.createCursorKeys();
  
  // Create additional keys
  const keys = {
    left: cursors.left!,
    right: cursors.right!,
    up: cursors.up!,
    down: cursors.down!,
    jump: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    interact: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    advance: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    escape: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    help: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H),
  };
  
  // Prevent default browser behavior for game keys
  keyboard.addCapture('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,E,ENTER,ESC,H');
  
  return keys;
}

/**
 * Check if moving left (A key or Left arrow)
 */
export function isMovingLeft(scene: Phaser.Scene, controls: GameControls): boolean {
  return controls.left.isDown || scene.input.keyboard!.addKey('A').isDown;
}

/**
 * Check if moving right (D key or Right arrow)
 */
export function isMovingRight(scene: Phaser.Scene, controls: GameControls): boolean {
  return controls.right.isDown || scene.input.keyboard!.addKey('D').isDown;
}

/**
 * Check if moving up (W key or Up arrow)
 */
export function isMovingUp(scene: Phaser.Scene, controls: GameControls): boolean {
  return controls.up.isDown || scene.input.keyboard!.addKey('W').isDown;
}

/**
 * Check if moving down (S key or Down arrow)
 */
export function isMovingDown(scene: Phaser.Scene, controls: GameControls): boolean {
  return controls.down.isDown || scene.input.keyboard!.addKey('S').isDown;
}

/**
 * Get horizontal movement direction (-1, 0, 1)
 */
export function getHorizontalAxis(scene: Phaser.Scene, controls: GameControls): number {
  let axis = 0;
  if (isMovingLeft(scene, controls)) axis -= 1;
  if (isMovingRight(scene, controls)) axis += 1;
  return axis;
}

/**
 * Get vertical movement direction (-1, 0, 1)
 */
export function getVerticalAxis(scene: Phaser.Scene, controls: GameControls): number {
  let axis = 0;
  if (isMovingUp(scene, controls)) axis -= 1;
  if (isMovingDown(scene, controls)) axis += 1;
  return axis;
}

/**
 * Check if player wants to advance/close dialogue (ENTER or SPACE)
 * Note: ESC is reserved for pause menu
 */
export function shouldCloseDialogue(controls: GameControls): boolean {
  return Phaser.Input.Keyboard.JustDown(controls.advance) ||
         Phaser.Input.Keyboard.JustDown(controls.jump);
}

