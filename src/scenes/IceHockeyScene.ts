import Phaser from "phaser";
import { createGraysonTopDownSprite } from "../utils/sprites/GraysonTopDownSprite";
import { createHockeyPlayerSprite } from "../utils/sprites/HockeyPlayerSprite";
import { createCardPieceSprite, spawnCardPieceSparkles } from "../utils/sprites";
import { shouldCloseDialogue } from "../utils/controls";
import type { GameControls } from "../utils/controls";
import { initializeGameScene } from "../utils/sceneSetup";
import type { DialogueManager } from "../utils/dialogueManager";
import type { HelpMenu } from "../utils/helpMenu";
import type { PauseMenu } from "../utils/pauseMenu";
import { fadeToScene } from "../utils/sceneTransitions";

/**
 * Ice Hockey Game Scene - Everett Silvertips
 * Level 2: Find Ceci at the hockey game
 */
export default class IceHockeyScene extends Phaser.Scene {
  private controls!: GameControls;
  private helpMenu!: HelpMenu;
  private pauseMenu!: PauseMenu;
  private dialogueManager!: DialogueManager;
  
  private player!: Phaser.GameObjects.Container;
  private playerPhysics!: Phaser.Physics.Arcade.Sprite;
  
  private hasShownRealization = false;
  private gameplayStarted = false;
  private levelCompleted = false;
  
  // Gameplay
  private health = 3;
  private maxHealth = 3;
  private healthDisplay!: Phaser.GameObjects.Text;
  private scoreDisplay!: Phaser.GameObjects.Text;
  private stickDisplay!: Phaser.GameObjects.Text;
  private enemiesDefeated = 0;
  private totalEnemies = 3;
  private enemies: Phaser.GameObjects.Container[] = [];
  private pucks: Phaser.Physics.Arcade.Sprite[] = [];
  private playerPucks: Phaser.Physics.Arcade.Sprite[] = []; // Pucks shot by player
  private speed = 80; // Start slow without skates
  private normalSpeed = 80;
  private skateSpeed = 140;
  private shootCooldown = 0;
  private shootCooldownTime = 500; // 0.5 second between shots
  private memoryFragment?: Phaser.GameObjects.Graphics;
  private memoryFragmentSpawned = false;
  private hockeyStick?: Phaser.GameObjects.Graphics;
  private hasStick = false;
  private skates?: Phaser.GameObjects.Graphics;
  private hasSkates = false;
  private chaseEnemyTimer = 0;
  private chaseEnemyInterval = 8000; // Spawn chaser every 8 seconds
  private chasers: Phaser.GameObjects.Container[] = [];
  
  // Invincibility frames
  private isInvincible = false;
  private invincibilityDuration = 1500; // 1 second of invincibility
  private blinkInterval = 100; // Blink every 100ms

  constructor() {
    super("IceHockey");
  }

  create() {
    console.log('Create called - health before reset:', this.health);
    
    // Initialize common scene setup (camera, controls, menus, dialogue)
    const setup = initializeGameScene(this);
    this.controls = setup.controls;
    this.helpMenu = setup.helpMenu;
    this.pauseMenu = setup.pauseMenu;
    this.dialogueManager = setup.dialogueManager;
    
    // Reset game state (in case of restart)
    this.health = 3; // Explicitly set to 3
    this.maxHealth = 3;
    this.gameplayStarted = false;
    this.hasShownRealization = false;
    this.levelCompleted = false;
    this.enemies = [];
    this.pucks = [];
    this.playerPucks = [];
    this.memoryFragment = undefined;
    this.memoryFragmentSpawned = false;
    this.shootCooldown = 0;
    this.hasStick = false;
    this.hockeyStick = undefined;
    this.hasSkates = false;
    this.skates = undefined;
    this.speed = this.normalSpeed; // Reset to slow speed
    this.chaseEnemyTimer = 0;
    this.chasers = [];
    this.isInvincible = false;
    this.enemiesDefeated = 0;
    
    console.log('Health after reset:', this.health);
    
    // Disable gravity for top-down view (no gravity from above!)
    this.physics.world.gravity.y = 0;
    
    // Create ice hockey rink
    this.createIceRink();
    
    // Create Grayson (top-down view) - starts at goal net (bottom)
    // Position him at center of field horizontally (160), bottom of field vertically
    this.player = createGraysonTopDownSprite(this, 160, 160);
    this.player.setDepth(10);
    
    // Create invisible physics body for player
    this.playerPhysics = this.physics.add.sprite(160, 160, '');
    this.playerPhysics.setSize(12, 14); // Small hitbox
    this.playerPhysics.setAlpha(0); // Invisible
    
    // Constrain player to playing field (between boards: x:85-235, y:8-172)
    this.playerPhysics.setCollideWorldBounds(false); // Don't use world bounds
    // We'll manually constrain in movement code
    
    // Create health display and equipment UI
    if (this.healthDisplay) {
      console.log('Destroying existing health display:', this.healthDisplay.text);
      this.healthDisplay.destroy(true); // Force destroy with children
    }
    
    // Small delay then recreate
    this.time.delayedCall(10, () => {
      console.log('Creating fresh health display with health:', this.health);
      this.healthDisplay = this.add.text(8, 8, `HP: ${this.health}/${this.maxHealth}`, {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ff0000",
        backgroundColor: "#000000",
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
        resolution: 1,
      }).setOrigin(0, 0).setDepth(100);
      console.log('Fresh health display text:', this.healthDisplay.text);
    });
    
    // Create scoreboard display (top-right)
    this.scoreDisplay = this.add.text(312, 8, `Defeated: ${this.enemiesDefeated}/${this.totalEnemies}`, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ffeb3b",
      backgroundColor: "#000000",
      padding: { left: 3, right: 3, top: 2, bottom: 2 },
      resolution: 1,
    }).setOrigin(1, 0).setDepth(100);
    
    // Create equipment status displays (below HP with more spacing)
    // Skates status
    const skatesDisplay = this.add.text(8, 24, "❌ Skates", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#999999",
      backgroundColor: "#000000",
      padding: { left: 3, right: 3, top: 1, bottom: 1 },
      resolution: 1,
    }).setOrigin(0, 0).setDepth(100);
    
    // Stick status (below skates)
    this.stickDisplay = this.add.text(8, 34, "❌ Stick", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#999999",
      backgroundColor: "#000000",
      padding: { left: 3, right: 3, top: 1, bottom: 1 },
      resolution: 1,
    }).setOrigin(0, 0).setDepth(100);
    
    // Store both for easy access
    this.stickDisplay.setData('skatesDisplay', skatesDisplay);
    
    // Spawn skates and hockey stick on the ice
    this.spawnSkates();
    this.spawnHockeyStick();
    
    // Grayson enters the field
    this.time.delayedCall(500, () => {
      this.graysonEntersField();
    });
  }
  
  private spawnSkates() {
    // Spawn skates near left board (close to border)
    const skatesX = 100;
    const skatesY = 120;
    
    this.skates = this.add.graphics();
    this.skates.setPosition(skatesX, skatesY);
    
    // Draw ice skates (silver blades with black boots)
    const BLADE_SILVER = 0xc0c0c0;
    const BOOT_BLACK = 0x1a1a1a;
    
    // Left skate
    this.skates.fillStyle(BOOT_BLACK, 1);
    this.skates.fillRect(-6, -3, 5, 6); // Boot
    this.skates.fillStyle(BLADE_SILVER, 1);
    this.skates.fillRect(-7, 2, 6, 2); // Blade extending out
    
    // Right skate
    this.skates.fillStyle(BOOT_BLACK, 1);
    this.skates.fillRect(1, -3, 5, 6); // Boot
    this.skates.fillStyle(BLADE_SILVER, 1);
    this.skates.fillRect(1, 2, 6, 2); // Blade extending out
    
    this.skates.setDepth(6);
  }
  
  private spawnHockeyStick() {
    // Spawn stick near right board (close to border - mirrored from skates)
    const stickX = 220;
    const stickY = 120;
    
    this.hockeyStick = this.add.graphics();
    this.hockeyStick.setPosition(stickX, stickY);
    
    // Draw hockey stick (brown stick with silver blade)
    const STICK_BROWN = 0x5d4037;
    const BLADE_SILVER = 0xc0c0c0;
    
    // Stick shaft (angled diagonal)
    this.hockeyStick.lineStyle(3, STICK_BROWN, 1);
    this.hockeyStick.beginPath();
    this.hockeyStick.moveTo(-10, -10);
    this.hockeyStick.lineTo(6, 6);
    this.hockeyStick.strokePath();
    
    // Blade at the end (silver)
    this.hockeyStick.fillStyle(BLADE_SILVER, 1);
    this.hockeyStick.fillRect(5, 5, 5, 3);
    
    this.hockeyStick.setDepth(6);
  }
  
  private createIceRink() {
    // Stands area background (darker - behind the boards)
    const stands = this.add.rectangle(160, 90, 320, 180, 0x37474f, 1);
    stands.setOrigin(0.5);
    
    // Playing field dimensions (narrower to leave room for stands)
    const fieldLeft = 85;
    const fieldRight = 235;
    const fieldWidth = fieldRight - fieldLeft;
    const fieldCenterX = (fieldLeft + fieldRight) / 2;
    
    // Ice surface background (white-ish blue) - only the playing field
    const ice = this.add.rectangle(fieldCenterX, 90, fieldWidth, 180, 0xe3f2fd, 1);
    ice.setOrigin(0.5);
    
    // Rink boards (darker blue border)
    const boardColor = 0x1565c0;
    const boardThickness = 6;
    
    // Top board
    this.add.rectangle(fieldCenterX, boardThickness / 2, fieldWidth, boardThickness, boardColor);
    // Bottom board
    this.add.rectangle(fieldCenterX, 180 - boardThickness / 2, fieldWidth, boardThickness, boardColor);
    // Left board
    this.add.rectangle(fieldLeft, 90, boardThickness, 180, boardColor);
    // Right board
    this.add.rectangle(fieldRight, 90, boardThickness, 180, boardColor);
    
    // Center ice - red line (horizontal, across the width of field)
    this.add.rectangle(fieldCenterX, 90, fieldWidth, 3, 0xff0000, 1);
    
    // Blue lines (zone markers) - horizontal lines dividing zones
    this.add.rectangle(fieldCenterX, 45, fieldWidth, 3, 0x0d47a1, 1);
    this.add.rectangle(fieldCenterX, 135, fieldWidth, 3, 0x0d47a1, 1);
    
    // Center circle
    const centerCircle = this.add.circle(fieldCenterX, 90, 20);
    centerCircle.setStrokeStyle(2, 0x0d47a1);
    centerCircle.setFillStyle(0xe3f2fd, 0);
    
    // Silvertips logo in center ice
    this.createSilvertipsLogo(fieldCenterX, 90);
    
    // Face-off circles (adjusted to be within the narrower field)
    this.createFaceoffCircle(120, 60);
    this.createFaceoffCircle(200, 60);
    this.createFaceoffCircle(120, 120);
    this.createFaceoffCircle(200, 120);
    
    // Goal nets (centered on the field)
    this.createGoalNet(fieldCenterX, 10);  // Top goal
    this.createGoalNet(fieldCenterX, 170); // Bottom goal (where Grayson enters)
    
    // Add crowd/audience in the stands
    this.createCrowd();
  }
  
  private createSilvertipsLogo(x: number, y: number) {
    const graphics = this.add.graphics();
    graphics.setDepth(2);
    
    // Exact colors from the analyzed logo image
    const BLACK = 0x000000;
    const DARK_GREEN = 0x2a6942;
    const LIGHT_GREEN = 0x739d8c;
    const OLIVE = 0x867226;
    const CREAM = 0xd3d0c2;
    const GOLD = 0xd6882d;
    // Skip white (0xffffff) - it's the background
    
    // 20x20 logo, each pixel is 1.5x1.5 for visibility
    const size = 1.5;
    const offsetX = x - 15;  // Half of 20*1.5
    const offsetY = y - 15;
    
    const p = (px: number, py: number, color: number) => {
      graphics.fillStyle(color, 1);
      graphics.fillRect(offsetX + px * size, offsetY + py * size, size, size);
    };
    
    // Black pixels (details/outlines)
    p(9,2,BLACK); p(10,2,BLACK); p(8,3,BLACK); p(11,3,BLACK); p(4,4,BLACK); p(5,4,BLACK); p(14,4,BLACK); p(15,4,BLACK); p(2,5,BLACK); p(3,5,BLACK); p(16,5,BLACK); p(0,6,BLACK); p(19,6,BLACK); p(0,7,BLACK); p(1,10,BLACK); p(18,10,BLACK); p(17,11,BLACK); p(3,12,BLACK); p(3,13,BLACK); p(16,13,BLACK); p(5,14,BLACK); p(14,14,BLACK); p(15,14,BLACK); p(6,15,BLACK); p(8,16,BLACK); p(11,16,BLACK);
    
    // Dark green pixels (main green)
    p(9,3,DARK_GREEN); p(4,5,DARK_GREEN); p(15,5,DARK_GREEN); p(1,6,DARK_GREEN); p(4,6,DARK_GREEN); p(7,6,DARK_GREEN); p(8,6,DARK_GREEN); p(9,6,DARK_GREEN); p(10,6,DARK_GREEN); p(11,6,DARK_GREEN); p(12,6,DARK_GREEN); p(15,6,DARK_GREEN); p(17,6,DARK_GREEN); p(18,6,DARK_GREEN); p(1,7,DARK_GREEN); p(4,7,DARK_GREEN); p(9,7,DARK_GREEN); p(10,7,DARK_GREEN); p(15,7,DARK_GREEN); p(1,8,DARK_GREEN); p(3,8,DARK_GREEN); p(16,8,DARK_GREEN); p(18,8,DARK_GREEN); p(1,9,DARK_GREEN); p(2,9,DARK_GREEN); p(8,9,DARK_GREEN); p(11,9,DARK_GREEN); p(17,9,DARK_GREEN); p(18,9,DARK_GREEN); p(2,10,DARK_GREEN); p(6,10,DARK_GREEN); p(8,10,DARK_GREEN); p(10,10,DARK_GREEN); p(11,10,DARK_GREEN); p(13,10,DARK_GREEN); p(17,10,DARK_GREEN); p(2,11,DARK_GREEN); p(3,11,DARK_GREEN); p(6,11,DARK_GREEN); p(9,11,DARK_GREEN); p(10,11,DARK_GREEN); p(13,11,DARK_GREEN); p(16,11,DARK_GREEN); p(6,12,DARK_GREEN); p(13,12,DARK_GREEN); p(4,13,DARK_GREEN); p(6,13,DARK_GREEN); p(8,13,DARK_GREEN); p(9,13,DARK_GREEN); p(10,13,DARK_GREEN); p(11,13,DARK_GREEN); p(13,13,DARK_GREEN); p(15,13,DARK_GREEN); p(6,14,DARK_GREEN); p(7,14,DARK_GREEN); p(8,14,DARK_GREEN); p(11,14,DARK_GREEN); p(12,14,DARK_GREEN); p(13,14,DARK_GREEN); p(7,15,DARK_GREEN); p(8,15,DARK_GREEN); p(9,15,DARK_GREEN); p(10,15,DARK_GREEN); p(11,15,DARK_GREEN); p(12,15,DARK_GREEN); p(9,16,DARK_GREEN); p(10,16,DARK_GREEN);
    
    // Light green/teal pixels
    p(10,3,LIGHT_GREEN); p(6,4,LIGHT_GREEN); p(7,4,LIGHT_GREEN); p(13,4,LIGHT_GREEN); p(5,5,LIGHT_GREEN); p(14,5,LIGHT_GREEN); p(5,6,LIGHT_GREEN); p(14,6,LIGHT_GREEN); p(4,8,LIGHT_GREEN); p(15,8,LIGHT_GREEN); p(7,10,LIGHT_GREEN); p(9,10,LIGHT_GREEN); p(12,10,LIGHT_GREEN); p(4,12,LIGHT_GREEN); p(7,12,LIGHT_GREEN); p(9,12,LIGHT_GREEN); p(10,12,LIGHT_GREEN); p(12,12,LIGHT_GREEN); p(15,12,LIGHT_GREEN); p(16,12,LIGHT_GREEN); p(7,13,LIGHT_GREEN); p(12,13,LIGHT_GREEN); p(9,14,LIGHT_GREEN); p(10,14,LIGHT_GREEN); p(13,15,LIGHT_GREEN);
    
    // Olive pixels
    p(2,6,OLIVE); p(18,7,OLIVE); p(8,8,OLIVE); p(9,8,OLIVE); p(10,8,OLIVE); p(11,8,OLIVE); p(7,9,OLIVE); p(12,9,OLIVE);
    
    // Cream pixels
    p(8,4,CREAM); p(9,4,CREAM); p(10,4,CREAM); p(11,4,CREAM); p(12,4,CREAM); p(6,5,CREAM); p(7,5,CREAM); p(8,5,CREAM); p(9,5,CREAM); p(10,5,CREAM); p(11,5,CREAM); p(12,5,CREAM); p(13,5,CREAM); p(6,6,CREAM); p(13,6,CREAM); p(5,7,CREAM); p(7,7,CREAM); p(8,7,CREAM); p(11,7,CREAM); p(12,7,CREAM); p(14,7,CREAM); p(5,8,CREAM); p(14,8,CREAM); p(3,9,CREAM); p(16,9,CREAM); p(3,10,CREAM); p(16,10,CREAM); p(7,11,CREAM); p(8,11,CREAM); p(11,11,CREAM); p(12,11,CREAM); p(8,12,CREAM); p(11,12,CREAM);
    
    // Gold/tan pixels
    p(3,6,GOLD); p(16,6,GOLD); p(2,7,GOLD); p(3,7,GOLD); p(6,7,GOLD); p(13,7,GOLD); p(16,7,GOLD); p(17,7,GOLD); p(2,8,GOLD); p(6,8,GOLD); p(7,8,GOLD); p(12,8,GOLD); p(13,8,GOLD); p(17,8,GOLD); p(4,9,GOLD); p(5,9,GOLD); p(6,9,GOLD); p(9,9,GOLD); p(10,9,GOLD); p(13,9,GOLD); p(14,9,GOLD); p(15,9,GOLD); p(4,10,GOLD); p(5,10,GOLD); p(14,10,GOLD); p(15,10,GOLD); p(4,11,GOLD); p(5,11,GOLD); p(14,11,GOLD); p(15,11,GOLD); p(5,12,GOLD); p(14,12,GOLD); p(5,13,GOLD); p(14,13,GOLD);
  }
  
  private createCrowd() {
    // Silvertips team colors - fans wearing team gear
    const crowdColors = [
      0x2a6942, // Dark green (primary team color)
      0x00523b, // Darker green
      0x739d8c, // Light green
      0xd6882d, // Gold/tan
      0xc69c6d, // Tan
      0xffffff, // White (alternate jerseys)
      0xd3d0c2, // Cream
      0x1a1a1a, // Black/dark gray
    ];
    
    // Left stands - multiple columns
    // From x:5 to about x:80 (stopping before the left board at x:85)
    for (let x = 5; x < 80; x += 8) {
      for (let y = 5; y <= 175; y += 10) { // Extended to fill top and bottom (one more row)
        const color = crowdColors[Math.floor(Math.random() * crowdColors.length)];
        const person = this.add.rectangle(x, y, 6, 8, color, 1);
        person.setDepth(1);
      }
    }
    
    // Right stands - multiple columns
    // From x:243 to x:318 (slightly adjusted position)
    for (let x = 243; x < 318; x += 8) {
      for (let y = 5; y <= 175; y += 10) { // Extended to fill top and bottom (one more row)
        const color = crowdColors[Math.floor(Math.random() * crowdColors.length)];
        const person = this.add.rectangle(x, y, 6, 8, color, 1);
        person.setDepth(1);
      }
    }
  }
  
  private createFaceoffCircle(x: number, y: number) {
    const circle = this.add.circle(x, y, 10);
    circle.setStrokeStyle(2, 0xff0000);
    circle.setFillStyle(0xe3f2fd, 0);
  }
  
  private createGoalNet(x: number, y: number) {
    // Goal net - red rectangle
    const isTop = y < 90;
    const netHeight = 12;
    const netWidth = 30;
    
    const net = this.add.rectangle(x, y, netWidth, netHeight, 0xff0000, 0);
    net.setStrokeStyle(2, 0xff0000);
    
    // Net lines (simple grid pattern)
    const netLines = this.add.graphics();
    netLines.lineStyle(1, 0xff0000, 0.5);
    
    if (isTop) {
      // Horizontal lines
      for (let i = 0; i <= netHeight; i += 3) {
        netLines.lineBetween(x - netWidth/2, y - netHeight/2 + i, x + netWidth/2, y - netHeight/2 + i);
      }
      // Vertical lines
      for (let i = 0; i <= netWidth; i += 4) {
        netLines.lineBetween(x - netWidth/2 + i, y - netHeight/2, x - netWidth/2 + i, y + netHeight/2);
      }
    } else {
      // Same for bottom goal
      for (let i = 0; i <= netHeight; i += 3) {
        netLines.lineBetween(x - netWidth/2, y - netHeight/2 + i, x + netWidth/2, y - netHeight/2 + i);
      }
      for (let i = 0; i <= netWidth; i += 4) {
        netLines.lineBetween(x - netWidth/2 + i, y - netHeight/2, x - netWidth/2 + i, y + netHeight/2);
      }
    }
  }
  
  private graysonEntersField() {
    // Grayson walks from bottom goal up into the field
    this.tweens.add({
      targets: [this.player, this.playerPhysics],
      y: 140, // Walk into the field
      duration: 2000,
      ease: "Linear",
      onComplete: () => {
        // Realization moment
        this.time.delayedCall(500, () => {
          this.showRealization();
        });
      }
    });
  }
  
  private showRealization() {
    if (this.hasShownRealization) return;
    this.hasShownRealization = true;
    
    this.showDialog("Grayson: Wait... I'm on the ice?!\nEveryone thinks I'm the goalie!");
    
    // After showing dialogue, start gameplay when player closes it
  }
  
  private startGameplay() {
    this.gameplayStarted = true;
    
    // Spawn enemy hockey players
    this.spawnEnemies();
  }
  
  private spawnEnemies() {
    // Spawn enemy hockey players with different shot and movement patterns
    const enemyData = [
      { x: 120, y: 60, pattern: 'aimed', movement: 'figure8' },     // Top left - figure-8 pattern
      { x: 200, y: 60, pattern: 'spread', movement: 'zigzag' },     // Top right - zigzag
      { x: 160, y: 30, pattern: 'circle', movement: 'circle' },     // Top center - circular
    ];
    
    enemyData.forEach((data, index) => {
      // Create proper hockey player sprite (black jersey with red accents)
      const enemy = createHockeyPlayerSprite(this, data.x, data.y, 0x1a1a1a, 0xff0000);
      enemy.setDepth(5);
      
      // Store enemy data
      enemy.setData('shootTimer', 0);
      enemy.setData('shootInterval', 2000 + Math.random() * 1000); // Shoot every 2-3 seconds
      enemy.setData('patrolAngle', index * 120); // For circular movement
      enemy.setData('startX', data.x);
      enemy.setData('startY', data.y);
      enemy.setData('shotPattern', data.pattern); // Shot pattern type
      enemy.setData('movementPattern', data.movement); // Movement pattern type
      
      this.enemies.push(enemy);
    });
  }
  
  private updateEnemies() {
    const dt = this.game.loop.delta;
    
    this.enemies.forEach((enemy) => {
      const movementPattern = enemy.getData('movementPattern');
      const startX = enemy.getData('startX');
      const startY = enemy.getData('startY');
      
      // Different movement patterns (RotMG-style)
      switch (movementPattern) {
        case 'circle':
          // Circular patrol
          const patrolAngle = enemy.getData('patrolAngle') + 0.02;
          enemy.setData('patrolAngle', patrolAngle);
          enemy.x = startX + Math.cos(patrolAngle) * 15;
          enemy.y = startY + Math.sin(patrolAngle) * 15;
          break;
          
        case 'figure8':
          // Figure-8 pattern (RotMG classic!)
          const f8Angle = enemy.getData('patrolAngle') + 0.025;
          enemy.setData('patrolAngle', f8Angle);
          // Lissajous curve for figure-8
          enemy.x = startX + Math.sin(f8Angle) * 25;
          enemy.y = startY + Math.sin(f8Angle * 2) * 15; // Double frequency for 8-shape
          break;
          
        case 'zigzag':
          // Zigzag pattern - sharp direction changes (slower)
          const zzAngle = enemy.getData('patrolAngle') + 0.005; // Even slower movement
          enemy.setData('patrolAngle', zzAngle);
          // Use floor to create sharp angles instead of smooth
          const zzStep = Math.floor(zzAngle / (Math.PI / 4)) % 2;
          enemy.x = startX + (zzStep === 0 ? 20 : -20);
          enemy.y = startY + Math.sin(zzAngle) * 25;
          break;
      }
      
      // Shooting timer
      let shootTimer = enemy.getData('shootTimer') + dt;
      const shootInterval = enemy.getData('shootInterval');
      
      if (shootTimer >= shootInterval) {
        shootTimer = 0;
        this.enemyShootPuck(enemy);
      }
      
      enemy.setData('shootTimer', shootTimer);
    });
  }
  
  private enemyShootPuck(enemy: Phaser.GameObjects.Container) {
    const pattern = enemy.getData('shotPattern');
    
    switch (pattern) {
      case 'aimed':
        this.shootAimedPuck(enemy);
        break;
      case 'spread':
        this.shootSpreadPucks(enemy);
        break;
      case 'circle':
        this.shootCircleBurst(enemy);
        break;
      default:
        this.shootAimedPuck(enemy);
    }
  }
  
  private shootAimedPuck(enemy: Phaser.GameObjects.Container) {
    // Single puck aimed at player
    const angle = Phaser.Math.Angle.Between(
      enemy.x, enemy.y,
      this.playerPhysics.x, this.playerPhysics.y
    );
    
    this.createPuck(enemy.x, enemy.y, angle, 150);
  }
  
  private shootSpreadPucks(enemy: Phaser.GameObjects.Container) {
    // 3 pucks in a spread pattern
    const baseAngle = Phaser.Math.Angle.Between(
      enemy.x, enemy.y,
      this.playerPhysics.x, this.playerPhysics.y
    );
    
    const spreadAngles = [
      baseAngle - 0.3, // Left
      baseAngle,       // Center
      baseAngle + 0.3  // Right
    ];
    
    spreadAngles.forEach(angle => {
      this.createPuck(enemy.x, enemy.y, angle, 140);
    });
  }
  
  private shootCircleBurst(enemy: Phaser.GameObjects.Container) {
    // 8 pucks in all directions (RotMG style!)
    const numPucks = 8;
    for (let i = 0; i < numPucks; i++) {
      const angle = (Math.PI * 2 / numPucks) * i;
      this.createPuck(enemy.x, enemy.y, angle, 130);
    }
  }
  
  private createPuck(x: number, y: number, angle: number, speed: number) {
    // Create puck projectile
    const puck = this.physics.add.sprite(x, y, '');
    puck.setCircle(4);
    puck.setDepth(8);
    puck.setAlpha(0); // Hide physics sprite
    
    // Draw puck visually with aura
    const puckGraphics = this.add.graphics();
    
    // Outer glow (bigger, more visible aura)
    puckGraphics.fillStyle(0xaaaaaa, 0.6);
    puckGraphics.fillCircle(0, 0, 8);
    
    // Main puck
    puckGraphics.fillStyle(0xffffff, 1);
    puckGraphics.fillCircle(0, 0, 4);
    puckGraphics.lineStyle(1, 0x000000, 1);
    puckGraphics.strokeCircle(0, 0, 4);
    
    puck.setData('graphics', puckGraphics);
    puckGraphics.setDepth(8);
    
    // Set velocity
    puck.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    
    this.pucks.push(puck);
    
    // Collision with player
    this.physics.add.overlap(puck, this.playerPhysics, () => {
      this.hitByPuck(puck);
    });
    
    // Destroy after time
    this.time.delayedCall(3000, () => {
      if (puck && puck.active) {
        const graphics = puck.getData('graphics');
        if (graphics) graphics.destroy();
        puck.destroy();
        const index = this.pucks.indexOf(puck);
        if (index > -1) this.pucks.splice(index, 1);
      }
    });
  }
  
  private hitByPuck(puck: Phaser.Physics.Arcade.Sprite) {
    // Check invincibility
    if (this.isInvincible) return;
    
    // Destroy the puck and its graphics
    const graphics = puck.getData('graphics');
    if (graphics) graphics.destroy();
    puck.destroy();
    const index = this.pucks.indexOf(puck);
    if (index > -1) this.pucks.splice(index, 1);
    
    // Take damage and start invincibility
    this.takeDamage();
  }
  
  private playerDeath() {
    this.levelCompleted = true; // Stop all gameplay
    this.gameplayStarted = false;
    
    console.log('Player died! Health was:', this.health);
    
    // Destroy all chasers and their text
    this.chasers.forEach(c => {
      const text = c.getData('tauntText');
      if (text && text.active) text.destroy();
      c.destroy();
    });
    this.chasers = [];
    
    this.showDialog("Grayson: Ow! Maybe I'm not cut out to be a goalie...\nPress ENTER to retry");
    
    // On dialogue close (ENTER press), restart the entire scene
    const waitForRestart = () => {
      if (this.dialogueManager.isVisible() && Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
        console.log('ENTER pressed - restarting scene...');
        this.scene.restart();
      } else {
        this.time.delayedCall(100, waitForRestart);
      }
    };
    
    this.time.delayedCall(100, waitForRestart);
  }
  
  private showDialog(message: string) {
    this.dialogueManager.show(message);
  }
  
  private hideDialog() {
    this.dialogueManager.hide();
    
    // Start gameplay after realization dialogue
    if (this.hasShownRealization && !this.gameplayStarted) {
      this.startGameplay();
    }
  }
  
  update() {
    // Stop all updates if level is completed (during fade out)
    if (this.levelCompleted) {
      return;
    }
    
    // Handle pause menu
    if (Phaser.Input.Keyboard.JustDown(this.controls.escape)) {
      this.pauseMenu.toggle();
    }
    
    if (this.pauseMenu.isVisible()) {
      if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
        this.pauseMenu.hide();
        this.scene.start("Title");
      }
      return;
    }
    
    // Handle help menu
    if (Phaser.Input.Keyboard.JustDown(this.controls.help)) {
      this.helpMenu.toggle();
    }
    
    if (this.helpMenu.isVisible()) {
      return;
    }
    
    // Handle dialogue (but allow gameplay to continue during equipment pickup messages)
    if (this.dialogueManager.isVisible()) {
      if (shouldCloseDialogue(this.controls)) {
        this.hideDialog();
      }
      // Only block gameplay if NOT during equipment collection
      // Block for: realization dialogue, memory dialogue
      // Allow: skates message, stick message
      const isEquipmentMessage = (this.hasStick || this.hasSkates) && !this.memoryFragmentSpawned;
      if (!isEquipmentMessage) {
        return; // Block for realization and memory dialogues
      }
      // Fall through to allow gameplay during equipment messages
    }
    
    // Gameplay movement (after dialogue is closed or during stick message)
    if (this.gameplayStarted) {
      this.handlePlayerMovement();
      this.updateEnemies();
      this.updateChasers();
      this.updatePucks();
      this.updateChaseSpawnTimer();
    }
    
    // After enemies defeated, player can still move to collect memory
    if (this.memoryFragmentSpawned && !this.gameplayStarted && !this.dialogueManager.isVisible()) {
      this.handlePlayerMovement(); // Allow movement to reach memory
    }
    
    // Check for equipment collection
    if (!this.hasSkates && this.skates && !this.dialogueManager.isVisible()) {
      this.checkSkatesCollection();
    }
    
    if (!this.hasStick && this.hockeyStick && !this.dialogueManager.isVisible()) {
      this.checkStickCollection();
    }
    
    // Always check for memory collection (even after enemies defeated)
    if (this.memoryFragmentSpawned && !this.dialogueManager.isVisible()) {
      this.checkMemoryCollection();
    }
  }
  
  private checkSkatesCollection() {
    if (!this.skates) return;
    
    const distance = Phaser.Math.Distance.Between(
      this.playerPhysics.x,
      this.playerPhysics.y,
      this.skates.x,
      this.skates.y
    );
    
    if (distance < 20 && Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
      // Collect skates!
      this.hasSkates = true;
      this.skates.destroy();
      this.skates = undefined;
      
      // Increase movement speed
      this.speed = this.skateSpeed;
      
      // Update equipment display
      this.updateEquipmentDisplay();
      
      // Show temporary message
      this.showDialog("Ice skates equipped! You move faster now!");
      
      this.time.delayedCall(2500, () => {
        if (this.dialogueManager.isVisible()) {
          this.hideDialog();
        }
      });
    }
  }
  
  private checkStickCollection() {
    if (!this.hockeyStick) return;
    
    const distance = Phaser.Math.Distance.Between(
      this.playerPhysics.x,
      this.playerPhysics.y,
      this.hockeyStick.x,
      this.hockeyStick.y
    );
    
    if (distance < 20 && Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
      // Collect stick!
      this.hasStick = true;
      this.hockeyStick.destroy();
      this.hockeyStick = undefined;
      
      // Add stick to Grayson's sprite
      this.addStickToPlayer();
      
      // Update equipment display
      this.updateEquipmentDisplay();
      
      // Show temporary message (non-blocking, auto-dismisses)
      this.showDialog("Hockey stick acquired! Press SPACE to shoot pucks!");
      
      // Auto-hide after 2.5 seconds
      this.time.delayedCall(2500, () => {
        if (this.dialogueManager.isVisible()) {
          this.hideDialog();
        }
      });
    }
  }
  
  private updateEquipmentDisplay() {
    const skatesDisplay = this.stickDisplay.getData('skatesDisplay');
    
    // Update skates display
    if (this.hasSkates) {
      skatesDisplay.setText("✓ Skates");
      skatesDisplay.setColor("#00ff00"); // Green
    } else {
      skatesDisplay.setText("❌ Skates");
      skatesDisplay.setColor("#999999"); // Gray
    }
    
    // Update stick display
    if (this.hasStick) {
      this.stickDisplay.setText("✓ Stick");
      this.stickDisplay.setColor("#00ff00"); // Green
    } else {
      this.stickDisplay.setText("❌ Stick");
      this.stickDisplay.setColor("#999999"); // Gray
    }
  }
  
  private addStickToPlayer() {
    // Add hockey stick graphics to player container
    const stickGraphics = this.add.graphics();
    
    const STICK_BROWN = 0x5d4037;
    const BLADE_SILVER = 0xc0c0c0;
    
    // Draw stick diagonally across player - extends on BOTH sides
    // From upper-left to lower-right, sticking out on both ends
    stickGraphics.lineStyle(3, STICK_BROWN, 1);
    stickGraphics.beginPath();
    stickGraphics.moveTo(-10, -5); // Upper-left (visible above player)
    stickGraphics.lineTo(8, 8);    // Lower-right (visible below player)
    stickGraphics.strokePath();
    
    // Add blade at lower-right end
    stickGraphics.fillStyle(BLADE_SILVER, 1);
    stickGraphics.fillRect(7, 7, 4, 2);
    
    // Add to player container so it moves with player
    // Add at index 0 so it's drawn FIRST (behind Grayson's body)
    this.player.addAt(stickGraphics, 0);
  }
  
  private checkMemoryCollection() {
    // Check if player is near memory fragment and presses E
    if (!this.memoryFragment) {
      console.log('No memory fragment exists');
      return;
    }
    
    console.log('Memory fragment exists at:', this.memoryFragment.x, this.memoryFragment.y);
    console.log('Player at:', this.playerPhysics.x, this.playerPhysics.y);
    
    const distance = Phaser.Math.Distance.Between(
      this.playerPhysics.x,
      this.playerPhysics.y,
      this.memoryFragment.x,
      this.memoryFragment.y
    );
    
    console.log('Distance to memory:', distance);
    
    // Debug: log distance when near
    if (distance < 30) {
      console.log('Near memory! Press E to collect');
      
      if (Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
        console.log('E pressed! Collecting memory!');
        // Collect memory!
        this.memoryFragment.destroy();
        this.memoryFragment = undefined;
        
        // Level complete!
        this.levelComplete();
      }
    }
  }
  
  private levelComplete() {
    console.log('Level complete called!');
    this.levelCompleted = true; // Stop all gameplay updates
    this.gameplayStarted = false;
    
    // Update registry: completed ice hockey (level 2)
    this.registry.set('completedLevels', 2);
    
    // Use fadeToScene utility for clean transition
    fadeToScene(this, "Game", 1000);
  }
  
  private updatePucks() {
    // Update enemy puck graphics positions (just move graphics to match physics)
    this.pucks.forEach(puck => {
      const graphics = puck.getData('graphics');
      if (graphics) {
        graphics.x = puck.x;
        graphics.y = puck.y;
      }
    });
    
    // Update player puck graphics positions
    this.playerPucks.forEach(puck => {
      const graphics = puck.getData('graphics');
      if (graphics) {
        graphics.x = puck.x;
        graphics.y = puck.y;
      }
      
      // Check collision with enemies manually (since we need container collision)
      this.enemies.forEach(enemy => {
        const distance = Phaser.Math.Distance.Between(puck.x, puck.y, enemy.x, enemy.y);
        if (distance < 10 && puck.active) {
          this.enemyHitByPuck(enemy, puck);
        }
      });
      
      // Check collision with chasers
      this.chasers.forEach(chaser => {
        const distance = Phaser.Math.Distance.Between(puck.x, puck.y, chaser.x, chaser.y);
        if (distance < 10 && puck.active) {
          this.chaserHitByPuck(chaser, puck);
        }
      });
    });
  }
  
  private chaserHitByPuck(chaser: Phaser.GameObjects.Container, puck: Phaser.Physics.Arcade.Sprite) {
    // Check distance
    const distance = Phaser.Math.Distance.Between(puck.x, puck.y, chaser.x, chaser.y);
    if (distance > 10) return;
    
    // Destroy puck
    const graphics = puck.getData('graphics');
    if (graphics) graphics.destroy();
    puck.destroy();
    const index = this.playerPucks.indexOf(puck);
    if (index > -1) this.playerPucks.splice(index, 1);
    
    // Destroy chaser (one hit kill)
    const tauntText = chaser.getData('tauntText');
    if (tauntText && tauntText.active) tauntText.destroy();
    chaser.destroy();
    const chaserIndex = this.chasers.indexOf(chaser);
    if (chaserIndex > -1) this.chasers.splice(chaserIndex, 1);
  }
  
  private handlePlayerMovement() {
    const dt = this.game.loop.delta / 1000;
    
    // Decrease shoot cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
      if (this.shootCooldown < 0) this.shootCooldown = 0;
    }
    
    // Get movement input from controls
    const vx = this.controls.left.isDown || this.input.keyboard!.addKey('A').isDown ? -1 :
               this.controls.right.isDown || this.input.keyboard!.addKey('D').isDown ? 1 : 0;
    const vy = this.controls.up.isDown || this.input.keyboard!.addKey('W').isDown ? -1 :
               this.controls.down.isDown || this.input.keyboard!.addKey('S').isDown ? 1 : 0;
    
    // Normalize diagonal movement
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const len = Math.sqrt(vx * vx + vy * vy);
      this.playerPhysics.setVelocity(
        (vx / len) * this.speed,
        (vy / len) * this.speed
      );
      
      // Rotate player sprite to face movement direction
      if (vx !== 0 || vy !== 0) {
        const angle = Math.atan2(vy, vx) * (180 / Math.PI);
        this.player.setAngle(angle + 90); // +90 because sprite faces up by default
      }
    } else {
      this.playerPhysics.setVelocity(0, 0);
    }
    
    // Shoot puck with Space (only if has stick)
    if (this.hasStick && Phaser.Input.Keyboard.JustDown(this.controls.jump) && this.shootCooldown === 0) {
      this.playerShootPuck();
      this.shootCooldown = this.shootCooldownTime / 1000; // Reset cooldown
    }
    
    // Constrain to playing field (between boards)
    const fieldLeft = 90;   // Just inside left board
    const fieldRight = 230; // Just inside right board
    const fieldTop = 12;    // Just inside top board
    const fieldBottom = 168; // Just inside bottom board
    
    this.playerPhysics.x = Phaser.Math.Clamp(this.playerPhysics.x, fieldLeft, fieldRight);
    this.playerPhysics.y = Phaser.Math.Clamp(this.playerPhysics.y, fieldTop, fieldBottom);
    
    // Sync visual sprite with physics body
    this.player.x = Math.round(this.playerPhysics.x);
    this.player.y = Math.round(this.playerPhysics.y);
  }
  
  private playerShootPuck() {
    // Shoot in the direction player is facing
    const angleRad = (this.player.angle - 90) * (Math.PI / 180);
    
    // Create puck projectile
    const puck = this.physics.add.sprite(this.playerPhysics.x, this.playerPhysics.y, '');
    puck.setCircle(4);
    puck.setDepth(8);
    puck.setAlpha(0); // Hide physics sprite
    
    // Draw puck visually (green with aura)
    const puckGraphics = this.add.graphics();
    
    // Outer glow (bigger, more visible green aura)
    puckGraphics.fillStyle(0x81c784, 0.6);
    puckGraphics.fillCircle(0, 0, 8);
    
    // Main puck (green - Grayson's shirt color)
    puckGraphics.fillStyle(0x81c784, 1);
    puckGraphics.fillCircle(0, 0, 4);
    puckGraphics.lineStyle(1, 0x000000, 1);
    puckGraphics.strokeCircle(0, 0, 4);
    
    puck.setData('graphics', puckGraphics);
    puckGraphics.setDepth(8);
    
    // Set velocity in facing direction
    const speed = 200; // Faster than enemy pucks
    puck.setVelocity(
      Math.cos(angleRad) * speed,
      Math.sin(angleRad) * speed
    );
    
    this.playerPucks.push(puck);
    
    // Collision with enemies is checked in updatePucks()
    
    // Destroy puck after time
    this.time.delayedCall(2000, () => {
      if (puck && puck.active) {
        const graphics = puck.getData('graphics');
        if (graphics) graphics.destroy();
        puck.destroy();
        const index = this.playerPucks.indexOf(puck);
        if (index > -1) this.playerPucks.splice(index, 1);
      }
    });
  }
  
  private enemyHitByPuck(enemy: Phaser.GameObjects.Container, puck: Phaser.Physics.Arcade.Sprite) {
    // Check if puck hits enemy (simple distance check)
    const distance = Phaser.Math.Distance.Between(puck.x, puck.y, enemy.x, enemy.y);
    if (distance > 10) return; // Not actually hitting
    
    // Destroy puck
    const graphics = puck.getData('graphics');
    if (graphics) graphics.destroy();
    puck.destroy();
    const index = this.playerPucks.indexOf(puck);
    if (index > -1) this.playerPucks.splice(index, 1);
    
    // White flash on hit (RotMG style)
    this.flashEnemyWhite(enemy);
    
    // Damage number floats up
    this.showDamageNumber(enemy.x, enemy.y);
    
    // One hit kill - enemy defeated!
    this.enemyDefeated(enemy);
  }
  
  private flashEnemyWhite(enemy: Phaser.GameObjects.Container) {
    // Get the graphics object (first child in container)
    const graphics = enemy.list[0] as Phaser.GameObjects.Graphics;
    if (!graphics) return;
    
    // Tint white temporarily (RotMG style hit flash)
    graphics.setAlpha(0.3);
    const whiteFlash = this.add.rectangle(enemy.x, enemy.y, 14, 20, 0xffffff, 0.8);
    whiteFlash.setDepth(15);
    
    this.time.delayedCall(80, () => {
      graphics.setAlpha(1);
      whiteFlash.destroy();
    });
  }
  
  private showDamageNumber(x: number, y: number) {
    // Floating damage number (RotMG white damage text)
    const damageText = this.add.text(x, y - 10, "1", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2,
      resolution: 2,
    }).setOrigin(0.5).setDepth(50);
    
    // Float up and fade (classic RotMG)
    this.tweens.add({
      targets: damageText,
      y: y - 25,
      alpha: 0,
      duration: 600,
      ease: "Power2",
      onComplete: () => damageText.destroy()
    });
  }
  
  private enemyDefeated(enemy: Phaser.GameObjects.Container) {
    const enemyX = enemy.x;
    const enemyY = enemy.y;
    
    // Particle explosion (RotMG style death burst)
    this.createDeathParticles(enemyX, enemyY);
    
    // Remove enemy
    enemy.destroy();
    const index = this.enemies.indexOf(enemy);
    if (index > -1) this.enemies.splice(index, 1);
    
    // Update score
    this.enemiesDefeated++;
    this.scoreDisplay.setText(`Defeated: ${this.enemiesDefeated}/${this.totalEnemies}`);
    
    // Flash score on kill
    this.scoreDisplay.setColor("#ffffff");
    this.time.delayedCall(200, () => {
      this.scoreDisplay.setColor("#ffeb3b");
    });
    
    // Check if ALL enemies defeated
    if (this.enemies.length === 0) {
      // All enemies defeated! Spawn THE memory fragment at center ice
      this.time.delayedCall(500, () => {
        this.spawnMemoryFragment();
      });
    }
  }
  
  private createDeathParticles(x: number, y: number) {
    // RotMG-style particle burst on death
    const particleCount = 8;
    const colors = [0x1a1a1a, 0xff0000, 0xffffff, 0x666666]; // Enemy colors
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 / particleCount) * i;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const particle = this.add.rectangle(x, y, 3, 3, color, 1);
      particle.setDepth(20);
      
      // Burst outward
      const distance = 20 + Math.random() * 10;
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;
      
      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: 400 + Math.random() * 200,
        ease: "Power2",
        onComplete: () => particle.destroy()
      });
    }
  }
  
  private spawnMemoryFragment() {
    if (this.memoryFragmentSpawned) return;
    this.memoryFragmentSpawned = true;
    
    // Stop player movement
    this.playerPhysics.setVelocity(0, 0);
    
    // Spawn at enemy goal net (top) - final destination
    const fragmentX = 160; // Center horizontally
    const fragmentY = 15;  // At the top goal net
    
    console.log('Spawning memory at:', fragmentX, fragmentY);
    console.log('Player currently at:', this.playerPhysics.x, this.playerPhysics.y);
    
    // Use the card piece sprite (now fixed to work with positioning)
    this.memoryFragment = createCardPieceSprite(this, fragmentX, fragmentY);
    this.memoryFragment.setDepth(20); // High depth to be visible above everything
    
    console.log('Memory fragment created at:', this.memoryFragment.x, this.memoryFragment.y);
    console.log('Memory fragment visible:', this.memoryFragment.visible);
    
    // Add sparkle effect after a small delay so it doesn't look like immediate collection
    this.time.delayedCall(300, () => {
      spawnCardPieceSparkles(this, fragmentX, fragmentY);
    });
    
    this.showDialog("All opponents defeated! Press ENTER, then skate to the goal and press E!");
  }
  
  private updateChaseSpawnTimer() {
    const dt = this.game.loop.delta;
    this.chaseEnemyTimer += dt;
    
    if (this.chaseEnemyTimer >= this.chaseEnemyInterval) {
      this.chaseEnemyTimer = 0;
      this.spawnChaseEnemy();
    }
  }
  
  private spawnChaseEnemy() {
    // Random spawn from sides with taunting text
    const spawns = [
      { x: 90, y: 90, text: "You're mine!" },
      { x: 230, y: 90, text: "Get him!" },
      { x: 160, y: 15, text: "No escape!" },
    ];
    
    const spawn = spawns[Math.floor(Math.random() * spawns.length)];
    
    // Create chaser (black jersey with red accents - same team)
    const chaser = createHockeyPlayerSprite(this, spawn.x, spawn.y, 0x1a1a1a, 0xff0000);
    chaser.setDepth(5);
    
    // Add floating text above chaser
    const tauntText = this.add.text(spawn.x, spawn.y - 15, spawn.text, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ff0000",
      fontStyle: "bold",
      backgroundColor: "#ffffff",
      padding: { left: 2, right: 2, top: 1, bottom: 1 },
      resolution: 1,
    }).setOrigin(0.5).setDepth(15);
    
    chaser.setData('tauntText', tauntText);
    chaser.setData('isChaser', true);
    
    // Fade out text after 2 seconds
    this.time.delayedCall(2000, () => {
      if (tauntText.active) {
        this.tweens.add({
          targets: tauntText,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            if (tauntText.active) tauntText.destroy();
          }
        });
      }
    });
    
    this.chasers.push(chaser);
  }
  
  private updateChasers() {
    const chaseSpeed = 60; // Slower than player but relentless
    const dt = this.game.loop.delta / 1000;
    
    this.chasers.forEach(chaser => {
      // Chase player directly
      const angle = Phaser.Math.Angle.Between(
        chaser.x, chaser.y,
        this.playerPhysics.x, this.playerPhysics.y
      );
      
      chaser.x += Math.cos(angle) * chaseSpeed * dt;
      chaser.y += Math.sin(angle) * chaseSpeed * dt;
      
      // Update text position if it still exists
      const tauntText = chaser.getData('tauntText');
      if (tauntText && tauntText.active) {
        tauntText.setPosition(chaser.x, chaser.y - 15);
      }
      
      // Check if chaser catches player (contact damage!)
      const distance = Phaser.Math.Distance.Between(
        chaser.x, chaser.y,
        this.playerPhysics.x, this.playerPhysics.y
      );
      
      if (distance < 15) {
        this.hitByChaser(chaser);
      }
    });
  }
  
  private hitByChaser(chaser: Phaser.GameObjects.Container) {
    // Check invincibility
    if (this.isInvincible) return;
    
    // Remove chaser
    const tauntText = chaser.getData('tauntText');
    if (tauntText && tauntText.active) tauntText.destroy();
    chaser.destroy();
    const index = this.chasers.indexOf(chaser);
    if (index > -1) this.chasers.splice(index, 1);
    
    // Take damage and start invincibility
    this.takeDamage();
  }
  
  private takeDamage() {
    // Reduce health
    this.health--;
    this.healthDisplay.setText(`HP: ${this.health}/${this.maxHealth}`);
    
    // Camera shake
    this.cameras.main.shake(200, 0.003);
    
    // Check if dead
    if (this.health <= 0) {
      this.playerDeath();
      return;
    }
    
    // Start invincibility frames
    this.isInvincible = true;
    
    // Blinking effect during invincibility
    let blinkCount = 0;
    const maxBlinks = this.invincibilityDuration / this.blinkInterval;
    
    const blinkTimer = this.time.addEvent({
      delay: this.blinkInterval,
      repeat: maxBlinks - 1,
      callback: () => {
        blinkCount++;
        // Toggle visibility
        this.player.setAlpha(blinkCount % 2 === 0 ? 0.3 : 1);
      }
    });
    
    // End invincibility after duration
    this.time.delayedCall(this.invincibilityDuration, () => {
      this.isInvincible = false;
      this.player.setAlpha(1); // Ensure fully visible
      blinkTimer.destroy();
    });
  }
}


