import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Load assets here later (sprites/tiles/audio).
  }

  create() {
    // When everything’s loaded, go to gameplay
    this.scene.start("Game");
  }
}
