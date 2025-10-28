import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Load assets here later, e.g.:
    // this.load.spritesheet("player", "assets/sprites/player.png", { frameWidth: 16, frameHeight: 16 });
  }

  create() {
    // When everything’s loaded, go to gameplay
    this.scene.start("Game");
  }
}
