import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Load assets here later (sprites/tiles/audio).
  }

  create() {
    this.scene.start("Title"); // go to the start screen first
  }
}
