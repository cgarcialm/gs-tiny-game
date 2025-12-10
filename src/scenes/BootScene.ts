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
    // Check WebGL availability first - required for 3D scenes
    if (!this.checkWebGLSupport()) {
      return; // Don't continue if WebGL is not available
    }
    
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
  
  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        this.showWebGLError();
        return false;
      }
      
      // Also test WebGL2 for Three.js
      const gl2 = canvas.getContext('webgl2');
      if (!gl2) {
        console.warn('WebGL2 not available, but WebGL1 works - proceeding with caution');
      }
      
      return true;
    } catch (e) {
      this.showWebGLError();
      return false;
    }
  }
  
  private showWebGLError() {
    // Hide the game canvas
    this.game.canvas.style.display = 'none';
    
    // Create error overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #1a1a2e;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: monospace;
      color: #ffffff;
      z-index: 9999;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    overlay.innerHTML = `
      <p style="font-size: 24px; margin-bottom: 10px; text-align: center;">
        Hi friend! 👋
      </p>
      <p style="font-size: 28px; color: #4ecdc4; margin-bottom: 30px; text-align: center;">
        I'm <strong>Ceci</strong>, you'll need to fix the following to play this cool game:
      </p>
      <h2 style="color: #ff6b6b; margin-bottom: 15px; text-align: center;">⚠️ WebGL Required</h2>
      <p style="max-width: 500px; text-align: center; line-height: 1.6; margin-bottom: 30px;">
        Your browser has it disabled, but don't worry - it's an easy fix!
      </p>
      <div style="background: #2a2a4e; padding: 20px; border-radius: 8px; max-width: 500px;">
        <h3 style="color: #4ecdc4; margin-bottom: 15px;">How to enable WebGL in Chrome:</h3>
        <ol style="text-align: left; line-height: 2;">
          <li>Open <code style="background: #1a1a2e; padding: 2px 6px; border-radius: 4px;">chrome://settings</code></li>
          <li>Go to <strong>System</strong></li>
          <li>Enable <strong>"Use graphics acceleration when available"</strong></li>
          <li>Restart Chrome</li>
        </ol>
        <p style="margin-top: 15px; color: #888;">
          Or try: <code style="background: #1a1a2e; padding: 2px 6px; border-radius: 4px;">chrome://flags/#ignore-gpu-blocklist</code> → Enable
        </p>
      </div>
      <button onclick="location.reload()" style="
        margin-top: 30px;
        padding: 12px 30px;
        font-size: 16px;
        font-family: monospace;
        background: #4ecdc4;
        color: #1a1a2e;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      ">Reload Page</button>
    `;
    
    document.body.appendChild(overlay);
  }
}
