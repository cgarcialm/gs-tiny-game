import Phaser from "phaser";
import { DEBUG_START_SCENE } from "../config/debug";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Load assets here later (sprites/tiles/audio).
    
    // Load photos with smooth filtering (not pixel art)
    this.load.on('filecomplete-image-grayson-photo', () => {
      const texture = this.textures.get('grayson-photo');
      if (texture) {
        texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    });
    
    this.load.on('filecomplete-image-hockey-chat', () => {
      const texture = this.textures.get('hockey-chat');
      if (texture) {
        texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    });
    
    this.load.image('grayson-photo', 'hinge-screenshot.png');
    this.load.image('hockey-chat', 'ice-hockey-chat.png');
  }

  create() {
    // Set camera to respect pixel art settings
    this.cameras.main.setRoundPixels(true);
    
    // Initialize registry for game progress
    if (!this.registry.has('completedLevels')) {
      this.registry.set('completedLevels', 0);
    }
    
    // In production, ALWAYS start with Title (ignore debug config)
    const isProduction = import.meta.env.PROD;
    
    if (isProduction) {
      console.log("[PRODUCTION] Starting from Title scene");
      this.scene.start("Title");
      return;
    }
    
    // Debug: Override start scene if configured (DEVELOPMENT ONLY)
    if (DEBUG_START_SCENE !== "Title") {
      console.log(`[DEBUG] Starting from scene: ${DEBUG_START_SCENE}`);
      this.scene.start(DEBUG_START_SCENE);
      return;
    }
    
    // Normal flow: start with title screen
    this.scene.start("Title");
  }
}
