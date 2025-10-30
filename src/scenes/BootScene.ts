import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Load assets here later (sprites/tiles/audio).
    
    // Load photo with smooth filtering (not pixel art)
    this.load.on('filecomplete-image-grayson-photo', () => {
      const texture = this.textures.get('grayson-photo');
      if (texture) {
        texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    });
    
    this.load.image('grayson-photo', 'hinge-screenshot.png');
  }

  create() {
    // Set camera to respect pixel art settings
    this.cameras.main.setRoundPixels(true);
    
    // Quick test: uncomment the line below to skip title and go straight to GameScene
    // this.scene.start("Game");
    
    // Normal flow: go to title screen
    this.scene.start("Title");
  }
}
