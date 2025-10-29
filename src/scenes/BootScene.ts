import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Load assets here later (sprites/tiles/audio).
  }

  create() {
    // Set camera to respect pixel art settings
    this.cameras.main.setRoundPixels(true);
    
    // Quick test: uncomment the line below to skip title and go straight to GameScene
    this.scene.start("Game");
    
    // Normal flow: go to title screen
    // this.scene.start("Title");
  }
}
