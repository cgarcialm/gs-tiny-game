import Phaser from "phaser";
import { DEBUG_START_SCENE } from "../config/debug";
import { GameStateManager } from "../managers/GameStateManager";
import { SCENES } from "../config/sceneConstants";

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
    
    // Load music
    this.load.audio('skyline-8bit', 'Skyline Echoes (8 bit).mp3');
    this.load.audio('skyline-full', 'Skyline Echoes.mp3');
  }

  create() {
    // Set camera to respect pixel art settings
    this.cameras.main.setRoundPixels(true);
    
    // Initialize game state manager
    const gameState = new GameStateManager(this.registry, !import.meta.env.PROD);
    
    // Initialize registry for game progress (only if not already set)
    if (gameState.getCompletedLevels() === 0 && !this.registry.has('completedLevels')) {
      // First time initialization
      gameState.setCompletedLevels(0);
    }
    
    // In production, ALWAYS start with Title (ignore debug config)
    const isProduction = import.meta.env.PROD;
    
    if (isProduction) {
      console.log("[PRODUCTION] Starting from Title scene");
      this.scene.start(SCENES.TITLE);
      return;
    }
    
    // Debug: Override start scene if configured (DEVELOPMENT ONLY)
    if (DEBUG_START_SCENE !== "Title") {
      console.log(`[DEBUG] Starting from scene: ${DEBUG_START_SCENE}`);
      this.scene.start(DEBUG_START_SCENE);
      return;
    }
    
    // Normal flow: start with title screen
    this.scene.start(SCENES.TITLE);
  }
}
