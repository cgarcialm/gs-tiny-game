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
    
    this.scene.start("Title"); // go to the start screen first
  }
}
