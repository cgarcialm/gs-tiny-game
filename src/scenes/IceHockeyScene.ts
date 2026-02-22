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
import { handleMenuInput } from "../utils/menuHandler";
import { spawnFloatingText, createParticleBurst } from "../utils/visualEffects";
import { checkProximity } from "../utils/collectionHelpers";
import { GameStateManager } from "../managers/GameStateManager";
import { SCENES, VOID_LEVELS } from "../config/sceneConstants";
import { HELP_HINT_X, HELP_HINT_Y } from "../utils/controls";
import { HELP_HINT_TEXT_STYLE } from "../config/textStyles";
import { buildMiniGameResult, recordMiniGameDeath, startMiniGameSession, submitMiniGameResult } from "../services/leaderboard";
import { DEBUG_SHOW_ICE_HOCKEY_PICKUP_HITBOXES } from "../config/debug";

// World larger than view: player fixed in middle, background scrolls (camera translation)
// Scroll max must reach (fieldRight - 160) and (fieldBottom - 90). So we need:
//   -OFFSET_X + WORLD_WIDTH - 320 >= (230 + OFFSET_X) - 160  =>  WORLD_WIDTH >= 390 + 2*OFFSET_X
//   -OFFSET_Y + WORLD_HEIGHT - 180 >= (168 + OFFSET_Y) - 90  =>  WORLD_HEIGHT >= 258 + 2*OFFSET_Y
const ICE_HOCKEY_WORLD_OFFSET_X = 380;
const ICE_HOCKEY_WORLD_OFFSET_Y = 476;
const ICE_HOCKEY_WORLD_WIDTH = 390 + ICE_HOCKEY_WORLD_OFFSET_X * 2;   // 1150 – extra so scroll right works
const ICE_HOCKEY_WORLD_HEIGHT = 258 + ICE_HOCKEY_WORLD_OFFSET_Y * 2;  // 1210 – extra so scroll down works
const ICE_HOCKEY_SCREEN_CENTER_X = 160;
const ICE_HOCKEY_SCREEN_CENTER_Y = 90;
const ICE_HOCKEY_RIGHT_UI_SCREEN_X = 250;
const ICE_HOCKEY_RIGHT_UI_SCREEN_Y = 0;
const ICE_HOCKEY_DIALOGUE_BOTTOM_Y = 165;

/**
 * Ice Hockey Game Scene - Everett Silvertips
 * Level 2: Find Ceci at the hockey game
 */
export default class IceHockeyScene extends Phaser.Scene {
  private gameState!: GameStateManager;
  private controls!: GameControls;
  private helpMenu!: HelpMenu;
  private pauseMenu!: PauseMenu;
  private dialogueManager!: DialogueManager;
  // @ts-ignore - CheatConsole used for side effects
  private _cheatConsole: any;
  
  private player!: Phaser.GameObjects.Container;
  private playerPhysics!: Phaser.Physics.Arcade.Sprite;
  
  private hasShownRealization = false;
  private realizationDialogueActive = false;
  private gameplayStarted = false;
  private levelCompleted = false;
  
  // Gameplay
  private health = 3;
  private maxHealth = 3;
  private healthDisplay!: Phaser.GameObjects.Container; // Container with hearts
  private scoreDisplay!: Phaser.GameObjects.Text;
  private stickDisplay!: Phaser.GameObjects.Container; // Container for equipment icons
  private enemiesDefeated = 0;
  private totalEnemies = 3;
  private enemies: Phaser.GameObjects.Container[] = [];
  private pucks: Phaser.Physics.Arcade.Sprite[] = [];
  private playerPucks: Phaser.Physics.Arcade.Sprite[] = []; // Pucks shot by player
  private enemyWave = 0;
  private speed = 80; // Start slow without skates
  private normalSpeed = 80;
  private skateSpeed = 140;
  private shootCooldown = 0;
  private shootCooldownTime = 500; // 0.5 second between shots
  private memoryFragment?: Phaser.GameObjects.Graphics;
  private memoryFragmentSpawned = false;
  private hockeyStick?: Phaser.GameObjects.Graphics;
  private hockeyStickHitbox?: Phaser.GameObjects.Graphics;
  private hasStick = false;
  private skates?: Phaser.GameObjects.Graphics;
  private skatesHitbox?: Phaser.GameObjects.Graphics;
  private hasSkates = false;
  private chaseEnemyTimer = 0;
  private chaseEnemyInterval = 3000; // Spawn chaser every 3 seconds
  private chasers: Phaser.GameObjects.Container[] = [];
  
  // World container: everything the main (rotating) camera draws. UI is on a separate camera so it never rotates.
  private worldContainer!: Phaser.GameObjects.Container;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private rightSideUIContainer!: Phaser.GameObjects.Container;
  private minimapContainer!: Phaser.GameObjects.Container;
  private playerDot!: Phaser.GameObjects.Rectangle;
  private enemyDots: Phaser.GameObjects.Graphics[] = [];
  
  // Invincibility frames
  private isInvincible = false;
  private invincibilityDuration = 1500; // 1 second of invincibility
  private blinkInterval = 100; // Blink every 100ms

  // Death sequence: opponents circle and fight cloud
  private deathCircleActive = false;
  private deathCircleTime = 0;

  // Camera rotation: Q left, E right (continuous); player always faces top of screen
  private cameraRotationRad = 0;
  private cameraRotationSpeed = 1.8; // radians per second
  private keyQ!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("IceHockey");
  }

  create() {
    console.log('Create called - health before reset:', this.health);
    
    // Initialize common scene setup (camera, controls, menus, dialogue, cheat console)
    const setup = initializeGameScene(this);
    this.controls = setup.controls;
    this.helpMenu = setup.helpMenu;
    this.pauseMenu = setup.pauseMenu;
    this.dialogueManager = setup.dialogueManager;
    this.gameState = setup.gameState;
    // @ts-ignore - CheatConsole used for side effects (global keyboard listener)
    this._cheatConsole = setup.cheatConsole;
    
    // Reset game state (in case of restart)
    this.health = 3; // Explicitly set to 3
    this.maxHealth = 3;
    this.gameplayStarted = false;
    this.hasShownRealization = false;
    this.realizationDialogueActive = false;
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
    this.enemiesDefeated = 0;
    this.totalEnemies = 3;
    this.enemyWave = 0;
    
    // Start with brief invincibility to prevent race conditions during scene initialization
    this.isInvincible = true;
    this.time.delayedCall(500, () => {
      this.isInvincible = false;
    });

    startMiniGameSession("ice_hockey");
    
    console.log('Health after reset:', this.health);
    
    this.physics.world.gravity.y = 0;
    
    this.worldContainer = this.add.container(0, 0);
    this.createIceRink();
    const playerStartX = ICE_HOCKEY_SCREEN_CENTER_X + ICE_HOCKEY_WORLD_OFFSET_X;
    const playerStartY = 160 + ICE_HOCKEY_WORLD_OFFSET_Y;
    this.player = createGraysonTopDownSprite(this, playerStartX, playerStartY);
    this.player.setDepth(10);
    this.playerPhysics = this.physics.add.sprite(playerStartX, playerStartY, '');
    this.playerPhysics.setSize(12, 14);
    this.playerPhysics.setAlpha(0);
    this.playerPhysics.setCollideWorldBounds(false);
    this.worldContainer.add([this.player, this.playerPhysics]);
    this.cameras.main.setBounds(
      -ICE_HOCKEY_WORLD_OFFSET_X,
      -ICE_HOCKEY_WORLD_OFFSET_Y,
      ICE_HOCKEY_WORLD_WIDTH,
      ICE_HOCKEY_WORLD_HEIGHT
    );
    this.cameras.main.startFollow(this.playerPhysics, true, 0.08, 0.08);
    this.cameraRotationRad = 0;
    this.keyQ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.rightSideUIContainer = this.add.container(ICE_HOCKEY_RIGHT_UI_SCREEN_X, ICE_HOCKEY_RIGHT_UI_SCREEN_Y);
    this.rightSideUIContainer.setDepth(100).setScrollFactor(0);
    this.createMinimap();
    this.createVisualSidebar();
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCamera.setScroll(0, 0).setRotation(0);
    this.cameras.main.ignore(this.rightSideUIContainer);
    this.cameras.main.ignore(this.dialogueManager.getContainer());
    this.uiCamera.ignore(this.worldContainer);
    
    const helpHintText = this.add.text(HELP_HINT_X, HELP_HINT_Y, "H for Help", HELP_HINT_TEXT_STYLE)
      .setOrigin(1, 1)
      .setDepth(10)
      .setScrollFactor(0);
    this.cameras.main.ignore(helpHintText);
    
    // Spawn skates and hockey stick on the ice
    this.spawnSkates();
    this.spawnHockeyStick();
    
    // Show intro overlay first
    this.showIntroOverlay();
  }
  
  private introActive = true;
  
  private showIntroOverlay() {
    const overlay = this.add.rectangle(160, 90, 260, 120, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0xf472b6)
      .setDepth(300)
      .setScrollFactor(0);
    const title = this.add.text(160, 45, "★ ICE HOCKEY ★", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#f472b6"
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    const instructions = this.add.text(160, 85, "Move: WASD  |  Shoot: SPACE\nWrong place, wrong time!\nGrab STICK + SKATES, fight back", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ffffff",
      align: "center",
      lineSpacing: 4
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    const pressEnter = this.add.text(160, 130, "[ PRESS ENTER ]", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ffff00"
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    // Pulse animation for Press ENTER
    this.tweens.add({
      targets: pressEnter,
      alpha: 0.5,
      duration: 600,
      yoyo: true,
      repeat: -1
    });
    
    // Wait for ENTER to start
    const waitForStart = () => {
      if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
        this.events.off('update', waitForStart);
        overlay.destroy();
        title.destroy();
        instructions.destroy();
        pressEnter.destroy();
        this.introActive = false;
        
        // Now start the game - Grayson enters the field
        this.time.delayedCall(500, () => {
          this.graysonEntersField();
        });
      }
    };
    this.events.on('update', waitForStart);
  }
  
  private createMinimap() {
    // Minimap above sidebar – all positions relative to rightSideUIContainer (anchor top-left 244, 10)
    const minimapWidth = 68;
    const minimapHeight = 60;
    const fieldW = 28;
    const fieldH = 48;
    const minimapBg = this.add.rectangle(0, 0, minimapWidth, minimapHeight, 0x1a1a1a, 0.9);
    minimapBg.setOrigin(0, 0).setDepth(100).setScrollFactor(0);
    minimapBg.setStrokeStyle(1, 0x666666, 1);
    const rinkGraphics = this.add.graphics();
    rinkGraphics.lineStyle(1, 0x4a90e2, 0.5);
    rinkGraphics.strokeRect(0, 0, fieldW, fieldH);
    rinkGraphics.setPosition(20, 6).setDepth(101).setScrollFactor(0);
    this.minimapContainer = this.add.container(20, 6);
    this.minimapContainer.setDepth(102).setScrollFactor(0);
    this.playerDot = this.add.rectangle(0, 0, 3, 3, 0xffffff, 1);
    this.minimapContainer.add(this.playerDot);
    this.rightSideUIContainer.add([minimapBg, rinkGraphics, this.minimapContainer]);
  }
  
  private updateMinimap() {
    const fieldLeft = 90 + ICE_HOCKEY_WORLD_OFFSET_X;
    const fieldTop = 12 + ICE_HOCKEY_WORLD_OFFSET_Y;
    const fieldWidth = 150;
    const fieldHeight = 156;
    const scaleX = 28 / fieldWidth;
    const scaleY = 48 / fieldHeight;
    const mapPlayerX = (this.playerPhysics.x - fieldLeft) * scaleX;
    const mapPlayerY = (this.playerPhysics.y - fieldTop) * scaleY;
    this.playerDot.setPosition(mapPlayerX, mapPlayerY);
    this.enemyDots.forEach(dot => dot.destroy());
    this.enemyDots = [];
    const addDot = (worldX: number, worldY: number, color: number) => {
      const relX = (worldX - fieldLeft) * scaleX;
      const relY = (worldY - fieldTop) * scaleY;
      const dot = this.add.graphics();
      dot.fillStyle(color, 1);
      dot.fillCircle(0, 0, 2);
      dot.setPosition(relX, relY).setDepth(102).setScrollFactor(0);
      this.minimapContainer.add(dot);
      this.enemyDots.push(dot);
    };
    this.enemies.forEach(enemy => addDot(enemy.x, enemy.y, 0xff0000));
    this.chasers.forEach(chaser => addDot(chaser.x, chaser.y, 0xff9800));
    if (this.memoryFragmentSpawned && this.memoryFragment) {
      const mx = (this.memoryFragment as Phaser.GameObjects.Graphics).x;
      const my = (this.memoryFragment as Phaser.GameObjects.Graphics).y;
      addDot(mx, my, 0xffeb3b);
    }
  }
  
  private createVisualSidebar() {
    // Panel positions relative to rightSideUIContainer; panel top-left at (0, 65)
    const panelWidth = 68;
    const panelHeight = 85;
    const panelRelX = 0;
    const panelRelY = 65;
    
    const panelBg = this.add.rectangle(panelRelX, panelRelY, panelWidth, panelHeight, 0x2a2a2a, 1);
    panelBg.setOrigin(0, 0).setDepth(100).setScrollFactor(0);
    panelBg.setStrokeStyle(1, 0x666666, 1);
    
    const portraitX = panelRelX + 6;
    const portraitY = panelRelY + 7;
    const portrait = this.add.graphics();
    portrait.fillStyle(0x81c784, 1);
    portrait.fillRect(portraitX, portraitY + 2, 8, 6);
    portrait.fillStyle(0xffe5cc, 1);
    portrait.fillRect(portraitX + 1, portraitY, 6, 3);
    portrait.setDepth(101).setScrollFactor(0);
    const textX = portraitX + 12;
    const graysonText = this.add.text(textX, portraitY + 2, "Grayson", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#ffffff",
      resolution: 1,
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0);
    const goalieText = this.add.text(portraitX, portraitY + 12, "Goalie", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#ffeb3b",
      resolution: 1,
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0);
    const hpLabelText = this.add.text(panelRelX + 4, panelRelY + 34, "HP:", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ffffff",
      resolution: 1,
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0);
    this.healthDisplay = this.add.container(panelRelX + 22, panelRelY + 33);
    this.healthDisplay.setDepth(101).setScrollFactor(0);
    this.updateHealthHearts();
    
    this.scoreDisplay = this.add.text(panelRelX + 4, panelRelY + 46, `KIL  ${this.enemiesDefeated}/${this.totalEnemies}`, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#ffffff",
      resolution: 1,
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0);
    
    const slotSize = 16;
    const totalSlots = 3;
    const inventoryBarY = panelRelY + 60;
    const inventoryBarHeight = slotSize + 1;
    const inventoryBarWidth = panelWidth - 1;
    const inventoryBarX = panelRelX;
    const totalSlotsWidth = slotSize * totalSlots;
    const slotsStartX = inventoryBarX + (inventoryBarWidth - totalSlotsWidth) / 2;
    const leftMargin = slotsStartX - inventoryBarX;
    const rightMargin = leftMargin;
    
    const inventoryBar = this.add.graphics();
    inventoryBar.fillStyle(0x444444, 1);
    inventoryBar.fillRect(inventoryBarX, inventoryBarY, leftMargin, inventoryBarHeight);
    inventoryBar.fillRect(slotsStartX + totalSlotsWidth, inventoryBarY, rightMargin, inventoryBarHeight);
    inventoryBar.fillStyle(0x1a1a1a, 1);
    inventoryBar.fillRect(slotsStartX, inventoryBarY, totalSlotsWidth, inventoryBarHeight);
    inventoryBar.setDepth(100).setScrollFactor(0);
    inventoryBar.lineStyle(1, 0x444444, 1);
    for (let i = 1; i < totalSlots; i++) {
      const x = slotsStartX + (i * slotSize);
      inventoryBar.lineBetween(x, inventoryBarY, x, inventoryBarY + slotSize);
    }
    inventoryBar.lineBetween(slotsStartX, inventoryBarY, slotsStartX + totalSlotsWidth, inventoryBarY);
    inventoryBar.lineBetween(slotsStartX, inventoryBarY + slotSize, slotsStartX + totalSlotsWidth, inventoryBarY + slotSize);
    inventoryBar.lineBetween(slotsStartX, inventoryBarY, slotsStartX, inventoryBarY + slotSize);
    inventoryBar.lineBetween(slotsStartX + totalSlotsWidth, inventoryBarY, slotsStartX + totalSlotsWidth, inventoryBarY + slotSize);
    
    const skatesIcon = this.add.graphics();
    const skateX = slotsStartX + 3;
    const skateY = inventoryBarY + 4;
    skatesIcon.fillStyle(0x666666, 1);
    skatesIcon.fillRect(skateX, skateY + 2, 5, 4);
    skatesIcon.fillStyle(0xe0e0e0, 1);
    skatesIcon.fillRect(skateX, skateY + 5, 6, 2);
    skatesIcon.fillStyle(0x666666, 1);
    skatesIcon.fillRect(skateX + 7, skateY + 2, 5, 4);
    skatesIcon.fillStyle(0xe0e0e0, 1);
    skatesIcon.fillRect(skateX + 6, skateY + 5, 6, 2);
    skatesIcon.setDepth(101).setScrollFactor(0);
    const stickIcon = this.add.graphics();
    const stickSlotX = slotsStartX + slotSize;
    stickIcon.lineStyle(2, 0x5d4037, 1);
    stickIcon.beginPath();
    stickIcon.moveTo(stickSlotX + 2, inventoryBarY + 3);
    stickIcon.lineTo(stickSlotX + 13, inventoryBarY + 14);
    stickIcon.strokePath();
    stickIcon.fillStyle(0xe0e0e0, 1);
    stickIcon.fillRect(stickSlotX + 11, inventoryBarY + 11, 3, 2);
    stickIcon.setDepth(101).setScrollFactor(0);
    const cardIcon = this.add.graphics();
    const cardSlotX = slotsStartX + slotSize * 2;
    cardIcon.fillStyle(0xffaa00, 1);
    cardIcon.fillRect(cardSlotX + 4, inventoryBarY + 4, 8, 8);
    cardIcon.fillStyle(0xff0000, 1);
    cardIcon.fillCircle(cardSlotX + 8, inventoryBarY + 8, 2);
    cardIcon.setDepth(101).setScrollFactor(0);
    cardIcon.setAlpha(0.4);
    this.stickDisplay = this.add.container(0, 0);
    this.stickDisplay.setScrollFactor(0);
    this.stickDisplay.setData('skatesIcon', skatesIcon);
    this.stickDisplay.setData('stickIcon', stickIcon);
    this.stickDisplay.setData('cardIcon', cardIcon);
    skatesIcon.setAlpha(0.4);
    stickIcon.setAlpha(0.4);
    
    this.rightSideUIContainer.add([
      panelBg, portrait, graysonText, goalieText, hpLabelText,
      this.healthDisplay, this.scoreDisplay, inventoryBar, skatesIcon, stickIcon, cardIcon,
    ]);
  }
  
  private updateHealthHearts() {
    // Clear existing hearts
    this.healthDisplay.removeAll(true);
    
    // Draw hearts based on current health
    for (let i = 0; i < this.maxHealth; i++) {
      const heartX = i * 12;
      const isFilled = i < this.health;
      
      const heart = this.add.text(heartX, 0, "♥", {
        fontSize: "12px",
        color: isFilled ? "#ff0000" : "#333333",
        resolution: 1,
      }).setOrigin(0, 0);
      
      this.healthDisplay.add(heart);
    }
  }
  
  private spawnSkates() {
    const skatesX = 100 + ICE_HOCKEY_WORLD_OFFSET_X;
    const skatesY = 120 + ICE_HOCKEY_WORLD_OFFSET_Y;
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
    this.worldContainer.add(this.skates);

    this.skatesHitbox?.destroy();
    if (DEBUG_SHOW_ICE_HOCKEY_PICKUP_HITBOXES) {
      this.skatesHitbox = this.add.graphics();
      this.skatesHitbox.setPosition(skatesX, skatesY);
      this.skatesHitbox.lineStyle(1, 0xffc107, 0.9);
      this.skatesHitbox.strokeCircle(0, 0, 9);
      this.skatesHitbox.setDepth(5);
      this.worldContainer.add(this.skatesHitbox);
    }
  }
  
  private spawnHockeyStick() {
    const stickX = 220 + ICE_HOCKEY_WORLD_OFFSET_X;
    const stickY = 120 + ICE_HOCKEY_WORLD_OFFSET_Y;
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
    this.worldContainer.add(this.hockeyStick);

    this.hockeyStickHitbox?.destroy();
    if (DEBUG_SHOW_ICE_HOCKEY_PICKUP_HITBOXES) {
      this.hockeyStickHitbox = this.add.graphics();
      this.hockeyStickHitbox.setPosition(stickX, stickY);
      this.hockeyStickHitbox.lineStyle(1, 0xffc107, 0.9);
      this.hockeyStickHitbox.strokeCircle(0, 0, 15);
      this.hockeyStickHitbox.setDepth(5);
      this.worldContainer.add(this.hockeyStickHitbox);
    }
  }
  
  private createIceRink() {
    const w = this.worldContainer;
    const ox = ICE_HOCKEY_WORLD_OFFSET_X;
    const oy = ICE_HOCKEY_WORLD_OFFSET_Y;
    const worldCenterX = ICE_HOCKEY_SCREEN_CENTER_X + ox;
    const worldCenterY = ICE_HOCKEY_SCREEN_CENTER_Y + oy;
    const stands = this.add.rectangle(worldCenterX, worldCenterY, ICE_HOCKEY_WORLD_WIDTH, ICE_HOCKEY_WORLD_HEIGHT, 0x37474f, 1);
    stands.setOrigin(0.5);
    w.add(stands);
    const fieldLeft = 85 + ox;
    const fieldRight = 235 + ox;
    const fieldWidth = fieldRight - fieldLeft;
    const fieldCenterX = (fieldLeft + fieldRight) / 2;
    const fieldCenterY = 90 + oy;
    const ice = this.add.rectangle(fieldCenterX, fieldCenterY, fieldWidth, 180, 0xe3f2fd, 1);
    ice.setOrigin(0.5);
    w.add(ice);
    const boardColor = 0x1565c0;
    const boardThickness = 6;
    w.add(this.add.rectangle(fieldCenterX, oy + boardThickness / 2, fieldWidth, boardThickness, boardColor));
    w.add(this.add.rectangle(fieldCenterX, oy + 180 - boardThickness / 2, fieldWidth, boardThickness, boardColor));
    w.add(this.add.rectangle(fieldLeft, fieldCenterY, boardThickness, 180, boardColor));
    w.add(this.add.rectangle(fieldRight, fieldCenterY, boardThickness, 180, boardColor));
    w.add(this.add.rectangle(fieldCenterX, fieldCenterY, fieldWidth, 3, 0xff0000, 1));
    w.add(this.add.rectangle(fieldCenterX, oy + 45, fieldWidth, 3, 0x0d47a1, 1));
    w.add(this.add.rectangle(fieldCenterX, oy + 135, fieldWidth, 3, 0x0d47a1, 1));
    const centerCircle = this.add.circle(fieldCenterX, fieldCenterY, 20);
    centerCircle.setStrokeStyle(2, 0x0d47a1);
    centerCircle.setFillStyle(0xe3f2fd, 0);
    w.add(centerCircle);
    this.createSilvertipsLogo(fieldCenterX, fieldCenterY);
    this.createFaceoffCircle(120 + ox, 60 + oy);
    this.createFaceoffCircle(200 + ox, 60 + oy);
    this.createFaceoffCircle(120 + ox, 120 + oy);
    this.createFaceoffCircle(200 + ox, 120 + oy);
    this.createGoalNet(fieldCenterX, oy + 10);
    this.createGoalNet(fieldCenterX, oy + 170);
    this.createCrowd();
  }
  
  private createSilvertipsLogo(x: number, y: number) {
    const graphics = this.add.graphics();
    graphics.setDepth(2);
    this.worldContainer.add(graphics);
    
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
    const w = this.worldContainer;
    const crowdColors = [0x2a6942, 0x00523b, 0x739d8c, 0xd6882d, 0xc69c6d, 0xffffff, 0xd3d0c2, 0x1a1a1a];
    const ox = ICE_HOCKEY_WORLD_OFFSET_X;
    const oy = ICE_HOCKEY_WORLD_OFFSET_Y;
    const worldW = ICE_HOCKEY_WORLD_WIDTH;
    const worldH = ICE_HOCKEY_WORLD_HEIGHT;
    const pick = () => crowdColors[Math.floor(Math.random() * crowdColors.length)];
    for (let x = 15; x < 80 + ox; x += 8) {
      for (let y = 8; y < worldH - 8; y += 10) {
        w.add(this.add.rectangle(x, y, 6, 8, pick(), 1).setDepth(1));
      }
    }
    for (let x = 243 + ox; x < worldW - 15; x += 8) {
      for (let y = 8; y < worldH - 8; y += 10) {
        w.add(this.add.rectangle(x, y, 6, 8, pick(), 1).setDepth(1));
      }
    }
    for (let x = 15; x < worldW - 15; x += 8) {
      for (let y = 10; y < oy - 10; y += 10) {
        w.add(this.add.rectangle(x, y, 6, 8, pick(), 1).setDepth(1));
      }
    }
    for (let x = 15; x < worldW - 15; x += 8) {
      for (let y = oy + 190; y < worldH - 10; y += 10) {
        w.add(this.add.rectangle(x, y, 6, 8, pick(), 1).setDepth(1));
      }
    }
  }
  
  private createFaceoffCircle(x: number, y: number) {
    const circle = this.add.circle(x, y, 10);
    circle.setStrokeStyle(2, 0xff0000);
    circle.setFillStyle(0xe3f2fd, 0);
    this.worldContainer.add(circle);
  }
  
  private createGoalNet(x: number, y: number) {
    const w = this.worldContainer;
    const isTop = y < ICE_HOCKEY_SCREEN_CENTER_Y + ICE_HOCKEY_WORLD_OFFSET_Y;
    const netHeight = 12;
    const netWidth = 30;
    
    const net = this.add.rectangle(x, y, netWidth, netHeight, 0xff0000, 0);
    net.setStrokeStyle(2, 0xff0000);
    w.add(net);
    
    const netLines = this.add.graphics();
    w.add(netLines);
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
    const walkTargetY = 140 + ICE_HOCKEY_WORLD_OFFSET_Y;
    this.tweens.add({
      targets: [this.player, this.playerPhysics],
      y: walkTargetY,
      duration: 2000,
      ease: "Linear",
      onComplete: () => {
        // Start gameplay right away when character reaches center (no second ENTER)
        this.startGameplay();
        this.showRealization(); // Show realization line as non-blocking; player can already move
      }
    });
  }
  
  private showRealization() {
    if (this.hasShownRealization) return;
    this.hasShownRealization = true;
    this.realizationDialogueActive = true;
    this.showDialog("Grayson: Wait... I'm on the ice?!\nEveryone thinks I'm the goalie!");
    this.time.delayedCall(4000, () => {
      if (this.realizationDialogueActive && this.dialogueManager.isVisible()) {
        this.dialogueManager.hide();
      }
      this.realizationDialogueActive = false;
    });
  }
  
  private spawnCrowdChatter(message: string, fromLeftSide: boolean = true) {
    // Crowd text appears from the stands using shared utility
    const x = fromLeftSide ? 35 + Math.random() * 30 : 250 + Math.random() * 30;
    const y = 20 + Math.random() * 140; // Vertical span of stands
    
    spawnFloatingText(this, x, y, message, {
      fontSize: "9px",
      color: "#ffeb3b",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center",
      distance: 40,
      duration: 6000,
      fadeDelay: 4000,
      fadeDuration: 2000,
      depth: 50,
      ease: "Power1",
    });
  }
  
  private startGameplay() {
    this.gameplayStarted = true;
    
    // Crowd chatter about equipment (after dialog closed)
    this.time.delayedCall(500, () => {
      this.spawnCrowdChatter("You need\nskates!");
    });
    this.time.delayedCall(200, () => {
      this.spawnCrowdChatter("Grab the\nstick!");
    });
    
    // Spawn enemy hockey players after a short delay
    this.time.delayedCall(600, () => this.spawnEnemies(1));
  }
  
  private spawnEnemies(speedMultiplier: number) {
    // Spawn enemy hockey players with different shot and movement patterns
    const ox = ICE_HOCKEY_WORLD_OFFSET_X;
    const oy = ICE_HOCKEY_WORLD_OFFSET_Y;
    const entryX = 245 + ox;
    const positions = [
      { x: 120 + ox, y: 60 + oy },
      { x: 200 + ox, y: 60 + oy },
      { x: 160 + ox, y: 30 + oy },
    ];
    const patterns = ["aimed", "spread", "circle"];
    const movements = ["figure8", "zigzag", "circle"];
    const shuffledPatterns = patterns
      .map((item) => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => item);
    const shuffledMovements = movements
      .map((item) => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => item);
    positions.forEach((pos, index) => {
      const data = {
        x: pos.x,
        y: pos.y,
        pattern: shuffledPatterns[index],
        movement: shuffledMovements[index],
      };
      // Create proper hockey player sprite (black jersey with red accents)
      const startX = speedMultiplier > 1 ? entryX : data.x;
      const enemy = createHockeyPlayerSprite(this, startX, data.y, 0x1a1a1a, 0xff0000);
      enemy.setDepth(5);
      
      // Store enemy data
      const shootInterval = (2000 + Math.random() * 1000) / speedMultiplier; // Faster waves shoot sooner
      const initialShootDelay = 3000;
      const shootTimer = Math.max(0, shootInterval - initialShootDelay);
      enemy.setData('shootTimer', shootTimer);
      enemy.setData('shootInterval', shootInterval); // Shoot every ~2-3 seconds (scaled)
      enemy.setData('patrolAngle', index * 120); // For circular movement
      enemy.setData('startX', data.x);
      enemy.setData('startY', data.y);
      enemy.setData('shotPattern', data.pattern); // Shot pattern type
      enemy.setData('movementPattern', data.movement); // Movement pattern type
      enemy.setData('speedMultiplier', speedMultiplier);
      
      this.enemies.push(enemy);
      this.worldContainer.add(enemy);

      if (speedMultiplier > 1) {
        enemy.setData('entering', true);
        this.tweens.add({
          targets: enemy,
          x: data.x,
          y: data.y,
          duration: 900,
          ease: "Sine.easeOut",
          onComplete: () => {
            enemy.setData('entering', false);
          },
        });
      }
    });
  }
  
  private updateEnemies() {
    const dt = this.game.loop.delta;
    
    this.enemies.forEach((enemy) => {
      if (enemy.getData('entering')) return;
      const movementPattern = enemy.getData('movementPattern');
      const speedMultiplier = enemy.getData('speedMultiplier') ?? 1;
      const startX = enemy.getData('startX');
      const startY = enemy.getData('startY');
      
      // Different movement patterns (RotMG-style)
      switch (movementPattern) {
        case 'circle':
          // Circular patrol
          const patrolAngle = enemy.getData('patrolAngle') + 0.02 * speedMultiplier;
          enemy.setData('patrolAngle', patrolAngle);
          enemy.x = startX + Math.cos(patrolAngle) * 15;
          enemy.y = startY + Math.sin(patrolAngle) * 15;
          break;
          
        case 'figure8':
          // Figure-8 pattern (RotMG classic!)
          const f8Angle = enemy.getData('patrolAngle') + 0.025 * speedMultiplier;
          enemy.setData('patrolAngle', f8Angle);
          // Lissajous curve for figure-8
          enemy.x = startX + Math.sin(f8Angle) * 25;
          enemy.y = startY + Math.sin(f8Angle * 2) * 15; // Double frequency for 8-shape
          break;
          
        case 'zigzag':
          // Zigzag pattern - sharp direction changes (slower)
          const zzAngle = enemy.getData('patrolAngle') + 0.005 * speedMultiplier; // Even slower movement
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
    // Single puck aimed at player (BLUE - precision shot)
    const angle = Phaser.Math.Angle.Between(
      enemy.x, enemy.y,
      this.playerPhysics.x, this.playerPhysics.y
    );
    
    this.createPuck(enemy.x, enemy.y, angle, 150, 0x4a90e2); // Blue
  }
  
  private shootSpreadPucks(enemy: Phaser.GameObjects.Container) {
    // 3 pucks in a spread pattern (ORANGE - area coverage)
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
      this.createPuck(enemy.x, enemy.y, angle, 140, 0xff9800); // Orange
    });
  }
  
  private shootCircleBurst(enemy: Phaser.GameObjects.Container) {
    // 8 pucks in all directions (RED - dangerous!)
    const numPucks = 8;
    for (let i = 0; i < numPucks; i++) {
      const angle = (Math.PI * 2 / numPucks) * i;
      this.createPuck(enemy.x, enemy.y, angle, 130, 0xff0000); // Red
    }
  }
  
  private createPuck(x: number, y: number, angle: number, speed: number, color: number = 0xffffff) {
    // Create puck projectile
    const puck = this.physics.add.sprite(x, y, '');
    puck.setCircle(4);
    puck.setDepth(8);
    puck.setAlpha(0); // Hide physics sprite
    
    // Draw puck visually with colored aura (RotMG style)
    const puckGraphics = this.add.graphics();
    
    // Outer glow (colored aura matching puck)
    puckGraphics.fillStyle(color, 0.5);
    puckGraphics.fillCircle(0, 0, 8);
    
    // Main puck (colored)
    puckGraphics.fillStyle(color, 1);
    puckGraphics.fillCircle(0, 0, 4);
    puckGraphics.lineStyle(1, 0x000000, 1);
    puckGraphics.strokeCircle(0, 0, 4);
    
    puck.setData('graphics', puckGraphics);
    puckGraphics.setDepth(8);
    
    // Set velocity
    puck.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    
    this.pucks.push(puck);
    this.worldContainer.add(puck);
    
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
    this.levelCompleted = true;
    this.gameplayStarted = false;
    recordMiniGameDeath("ice_hockey");
    this.playerPhysics.setVelocity(0, 0);
    this.player.x = Math.round(this.playerPhysics.x);
    this.player.y = Math.round(this.playerPhysics.y);
    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(
      this.playerPhysics.x - ICE_HOCKEY_SCREEN_CENTER_X,
      this.playerPhysics.y - ICE_HOCKEY_SCREEN_CENTER_Y
    );
    this.chasers.forEach(c => {
      const text = c.getData('tauntText');
      if (text && text.active) text.destroy();
      c.destroy();
    });
    this.chasers = [];
    this.pucks.forEach(puck => { if (puck.body) puck.setVelocity(0, 0); });
    this.playerPucks.forEach(puck => { if (puck.body) puck.setVelocity(0, 0); });

    const tx = this.playerPhysics.x;
    const ty = this.playerPhysics.y;
    const approachDuration = 1000;
    const orbitRadius = 14; // ring around player so opponents cover him
    this.enemies.forEach((enemy, index) => {
      const baseAngle = (index / this.enemies.length) * 2 * Math.PI;
      const destX = tx + orbitRadius * Math.cos(baseAngle);
      const destY = ty + orbitRadius * Math.sin(baseAngle);
      enemy.setData("orbitBaseAngle", baseAngle);
      this.tweens.add({
        targets: enemy,
        x: destX,
        y: destY,
        duration: approachDuration,
        ease: "Linear",
      });
    });
    this.time.delayedCall(approachDuration + 150, () => {
      this.deathCircleActive = true;
      this.deathCircleTime = 0;
      this.showFightCloud();
    });

    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      duration: 280,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.showDialog("Grayson: Ow! I forgot my mouth guard...\nPress ENTER to retry");
  }

  private showFightCloud() {
    const x = this.playerPhysics.x;
    const y = this.playerPhysics.y;
    const g = this.add.graphics();
    g.setPosition(x, y);
    g.setDepth(20);
    // Cloud: overlapping puffs, bigger circles; darker grays
    const puffs: { x: number; y: number; r: number; gray: number; alpha: number }[] = [
      { x: -8, y: -6, r: 13, gray: 0x666666, alpha: 0.58 },
      { x: 6, y: -8, r: 12, gray: 0x666666, alpha: 0.56 },
      { x: -4, y: 4, r: 12, gray: 0x666666, alpha: 0.56 },
      { x: 8, y: 2, r: 11, gray: 0x707070, alpha: 0.54 },
      { x: 0, y: -2, r: 11, gray: 0x787878, alpha: 0.52 },
      { x: -10, y: 2, r: 11, gray: 0x787878, alpha: 0.52 },
      { x: 4, y: -4, r: 11, gray: 0x787878, alpha: 0.5 },
      { x: -6, y: -10, r: 10, gray: 0x808080, alpha: 0.5 },
      { x: 10, y: -4, r: 10, gray: 0x808080, alpha: 0.5 },
      { x: 2, y: 8, r: 10, gray: 0x808080, alpha: 0.5 },
      { x: -2, y: -4, r: 10, gray: 0x888888, alpha: 0.48 },
      { x: 6, y: 6, r: 10, gray: 0x888888, alpha: 0.48 },
    ];
    puffs.forEach((p) => {
      g.fillStyle(p.gray, p.alpha);
      g.fillCircle(p.x, p.y, p.r);
    });
    g.setScale(0.85);
    this.worldContainer.add(g);
    this.tweens.add({
      targets: g,
      scale: 1.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.spawnFightCloudStars(x, y);
  }

  private spawnFightCloudStars(cloudX: number, cloudY: number) {
    const spawnStar = () => {
      const offsetX = (Math.random() - 0.5) * 28;
      const offsetY = (Math.random() - 0.5) * 28;
      const star = this.add.graphics();
      star.setPosition(cloudX + offsetX, cloudY + offsetY);
      star.setDepth(21);
      const R = 6;
      const r = 2;
      const cos = Math.cos(Math.PI / 4);
      const sin = Math.sin(Math.PI / 4);
      star.fillStyle(0xeeeeee, 0.95);
      star.beginPath();
      star.moveTo(R, 0);
      star.lineTo(r * cos, r * sin);
      star.lineTo(0, R);
      star.lineTo(-r * cos, r * sin);
      star.lineTo(-R, 0);
      star.lineTo(-r * cos, -r * sin);
      star.lineTo(0, -R);
      star.lineTo(r * cos, -r * sin);
      star.closePath();
      star.fillPath();
      star.setScale(0.2);
      this.worldContainer.add(star);
      this.tweens.add({
        targets: star,
        scale: 1.4,
        alpha: 0,
        duration: 420,
        ease: "Cubic.easeOut",
        onComplete: () => star.destroy(),
      });
    };
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(180 * i, spawnStar);
    }
    this.time.delayedCall(1400, () => this.spawnFightCloudStars(cloudX, cloudY));
  }

  private updateFixedUI() {
    this.rightSideUIContainer.setPosition(ICE_HOCKEY_RIGHT_UI_SCREEN_X, ICE_HOCKEY_RIGHT_UI_SCREEN_Y);
    this.dialogueManager.setContainerPosition(
      ICE_HOCKEY_SCREEN_CENTER_X - 160,
      ICE_HOCKEY_DIALOGUE_BOTTOM_Y - 160
    );
  }

  private updateDeathAnimation() {
    if (!this.deathCircleActive || this.enemies.length === 0) return;
    const dt = this.game.loop.delta;
    this.deathCircleTime += dt;
    const cx = this.playerPhysics.x;
    const cy = this.playerPhysics.y;
    const baseRadius = 14;
    const inOutAmplitude = 6;
    const orbitSpeed = 0.004;
    const inOutSpeed = 0.009;
    this.enemies.forEach((enemy) => {
      const baseAngle = enemy.getData("orbitBaseAngle") as number;
      const angle = baseAngle + this.deathCircleTime * orbitSpeed;
      const inOut = inOutAmplitude * Math.sin(this.deathCircleTime * inOutSpeed);
      const r = baseRadius + inOut;
      enemy.x = cx + r * Math.cos(angle);
      enemy.y = cy + r * Math.sin(angle);
    });
  }

  private showDialog(message: string) {
    if (!message.includes("I'm on the ice")) this.realizationDialogueActive = false;
    this.dialogueManager.show(message);
  }
  
  private hideDialog() {
    this.realizationDialogueActive = false;
    this.dialogueManager.hide();
    
    // Start gameplay after realization dialogue
    if (this.hasShownRealization && !this.gameplayStarted) {
      this.startGameplay();
    }
  }
  
  update() {
    if (this.levelCompleted) {
      this.updateDeathAnimation();
      this.updateFixedUI();
      if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
        this.scene.start(SCENES.ICE_HOCKEY);
      }
      return;
    }
    if (this.introActive) {
      this.updateFixedUI();
      return;
    }
    
    // Camera rotation: Q rotate left, E rotate right (continuous); player always faces top of screen
    const dt = this.game.loop.delta / 1000;
    if (this.keyQ.isDown) this.cameraRotationRad += this.cameraRotationSpeed * dt;
    if (this.keyE.isDown) this.cameraRotationRad -= this.cameraRotationSpeed * dt;
    this.cameras.main.setRotation(this.cameraRotationRad);
    this.player.angle = -this.cameraRotationRad * (180 / Math.PI);
    this.updateFixedUI();
    
    // Handle menu input (ESC for pause, H for help, M for mute)
    const openLeaderboard = () => {
      this.scene.pause();
      this.scene.launch(SCENES.LEADERBOARD, { returnScene: this.sys.settings.key });
    };
    if (handleMenuInput(this, this.controls, this.helpMenu, this.pauseMenu, undefined, openLeaderboard, this._cheatConsole, this.gameState)) {
      return;
    }
    
    // Handle dialogue (but allow gameplay to continue during equipment pickup and realization)
    if (this.dialogueManager.isVisible()) {
      if (shouldCloseDialogue(this.controls)) {
        this.hideDialog();
      }
      const isEquipmentMessage = (this.hasStick || this.hasSkates) && !this.memoryFragmentSpawned;
      const isRealizationMessage = this.hasShownRealization && this.gameplayStarted;
      if (!isEquipmentMessage && !isRealizationMessage) {
        return; // Block only for memory / other blocking dialogues
      }
    }
    
    // Gameplay movement (after dialogue is closed or during stick message)
    if (this.gameplayStarted) {
      this.handlePlayerMovement();
      this.updateEnemies();
      this.updateChasers();
      this.updatePucks();
      this.updateChaseSpawnTimer();
      this.updateMinimap(); // Update minimap positions
    }
    
    // After enemies defeated, player can still move to collect memory
    if (this.memoryFragmentSpawned && !this.gameplayStarted && !this.dialogueManager.isVisible()) {
      this.handlePlayerMovement(); // Allow movement to reach memory
      this.updateMinimap(); // Keep minimap updated
    }
    
    // Check for equipment collection (allow during equipment messages)
    if (!this.hasSkates && this.skates) {
      this.checkSkatesCollection();
      if (this.skatesHitbox) {
        this.skatesHitbox.setPosition(this.skates.x, this.skates.y);
      }
    }
    
    if (!this.hasStick && this.hockeyStick) {
      this.checkStickCollection();
      if (this.hockeyStickHitbox) {
        this.hockeyStickHitbox.setPosition(this.hockeyStick.x, this.hockeyStick.y);
      }
    }
    
    // Always check for memory collection (even after enemies defeated)
    if (this.memoryFragmentSpawned && !this.dialogueManager.isVisible()) {
      this.checkMemoryCollection();
    }
  }
  
  private checkSkatesCollection() {
    if (!this.skates) return;
    const isNear = checkProximity(this.playerPhysics, this.skates, 9);
    if (!isNear) return;
    this.hasSkates = true;
    this.skates.destroy();
    this.skates = undefined;
    this.skatesHitbox?.destroy();
    this.skatesHitbox = undefined;
    this.speed = this.skateSpeed;
    this.updateEquipmentDisplay();
    this.showDialog("Ice skates equipped! You move faster now!");
    this.time.delayedCall(2500, () => {
      if (this.dialogueManager.isVisible()) this.dialogueManager.hide();
    });
  }
  
  private checkStickCollection() {
    if (!this.hockeyStick) return;
    const isNear = checkProximity(this.playerPhysics, this.hockeyStick, 15);
    if (!isNear) return;
    this.hasStick = true;
    this.hockeyStick.destroy();
    this.hockeyStick = undefined;
    this.hockeyStickHitbox?.destroy();
    this.hockeyStickHitbox = undefined;
    this.addStickToPlayer();
    this.updateEquipmentDisplay();
    this.showDialog("Hockey stick acquired! Press SPACE to shoot pucks!");
    this.time.delayedCall(2500, () => {
      if (this.dialogueManager.isVisible()) this.dialogueManager.hide();
    });
  }
  
  private updateEquipmentDisplay() {
    const skatesIcon = this.stickDisplay.getData('skatesIcon');
    const stickIcon = this.stickDisplay.getData('stickIcon');
    
    // Update skates icon (brighten when collected)
    if (this.hasSkates) {
      skatesIcon.setAlpha(1); // Bright when collected
    } else {
      skatesIcon.setAlpha(0.4); // Dim when not collected (40%)
    }
    
    // Update stick icon (brighten when collected)
    if (this.hasStick) {
      stickIcon.setAlpha(1); // Bright when collected
    } else {
      stickIcon.setAlpha(0.4); // Dim when not collected (40%)
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
    if (!this.memoryFragment) return;
    if (!checkProximity(this.playerPhysics, this.memoryFragment, 9)) return;
    this.memoryFragment.destroy();
    this.memoryFragment = undefined;
    this.levelComplete();
  }
  
  private levelComplete() {
    console.log('Level complete called!');
    this.levelCompleted = true; // Stop all gameplay updates
    this.gameplayStarted = false;
    this.playerPhysics.setVelocity(0, 0);
    this.cameras.main.setScroll(
      this.playerPhysics.x - ICE_HOCKEY_SCREEN_CENTER_X,
      this.playerPhysics.y - ICE_HOCKEY_SCREEN_CENTER_Y
    );
    // Light up the card icon in inventory
    const cardIcon = this.stickDisplay.getData('cardIcon');
    if (cardIcon) {
      cardIcon.setAlpha(1); // Bright when collected
    }

    const result = buildMiniGameResult("ice_hockey");
    void (async () => {
      await submitMiniGameResult("ice_hockey", result);
      this.scene.start(SCENES.LEADERBOARD, { miniGame: "ice_hockey", nextScene: SCENES.GAME });
    })();
    
    // Small delay to show the card lighting up
    this.time.delayedCall(500, () => {
      // Complete Ice Hockey level
      this.gameState.completeLevel(VOID_LEVELS.AFTER_ICE_HOCKEY);
      
      // scene transition handled after submit
    });
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
        if (checkProximity(puck, enemy, 10) && puck.active) {
          this.enemyHitByPuck(enemy, puck);
        }
      });
      
      // Check collision with chasers
      this.chasers.forEach(chaser => {
        if (checkProximity(puck, chaser, 10) && puck.active) {
          this.chaserHitByPuck(chaser, puck);
        }
      });
    });
  }
  
  private chaserHitByPuck(chaser: Phaser.GameObjects.Container, puck: Phaser.Physics.Arcade.Sprite) {
    // Check proximity using utility
    if (!checkProximity(puck, chaser, 10)) return;
    
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
    
    // Get movement input (screen-relative: W = up on screen, etc.) and convert to world velocity.
    // Use -cameraRotationRad so "screen up" matches the rotated view (Phaser camera +angle = CCW).
    const vx = this.controls.left.isDown || this.input.keyboard!.addKey('A').isDown ? -1 :
               this.controls.right.isDown || this.input.keyboard!.addKey('D').isDown ? 1 : 0;
    const vy = this.controls.up.isDown || this.input.keyboard!.addKey('W').isDown ? -1 :
               this.controls.down.isDown || this.input.keyboard!.addKey('S').isDown ? 1 : 0;
    
    const R = -this.cameraRotationRad;
    const worldVx = vx * Math.cos(R) - vy * Math.sin(R);
    const worldVy = vx * Math.sin(R) + vy * Math.cos(R);
    
    const moving = worldVx !== 0 || worldVy !== 0;
    if (moving) {
      const len = Math.sqrt(worldVx * worldVx + worldVy * worldVy);
      this.playerPhysics.setVelocity(
        (worldVx / len) * this.speed,
        (worldVy / len) * this.speed
      );
    } else {
      this.playerPhysics.setVelocity(0, 0);
    }
    
    // Shoot puck with Space (only if has stick)
    if (this.hasStick && Phaser.Input.Keyboard.JustDown(this.controls.jump) && this.shootCooldown === 0) {
      this.playerShootPuck();
      this.shootCooldown = this.shootCooldownTime / 1000; // Reset cooldown
    }
    
    // Constrain to playing field (between boards)
    const fieldLeft = 90 + ICE_HOCKEY_WORLD_OFFSET_X;
    const fieldRight = 230 + ICE_HOCKEY_WORLD_OFFSET_X;
    const fieldTop = 12 + ICE_HOCKEY_WORLD_OFFSET_Y;
    const fieldBottom = 168 + ICE_HOCKEY_WORLD_OFFSET_Y;
    
    this.playerPhysics.x = Phaser.Math.Clamp(this.playerPhysics.x, fieldLeft, fieldRight);
    this.playerPhysics.y = Phaser.Math.Clamp(this.playerPhysics.y, fieldTop, fieldBottom);
    
    // Sync visual sprite with physics body
    this.player.x = Math.round(this.playerPhysics.x);
    this.player.y = Math.round(this.playerPhysics.y);
  }
  
  private playerShootPuck() {
    // Crowd encouragement on first shot (from left stands)
    if (!this.stickDisplay.getData('hasShot')) {
      this.stickDisplay.setData('hasShot', true);
      const shootMessages = ["Nice shot!", "Get 'em!", "Yeah!"];
      const msg = shootMessages[Math.floor(Math.random() * shootMessages.length)];
      this.spawnCrowdChatter(msg);
    }
    
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
    this.worldContainer.add(puck);
    
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
    // Check if puck hits enemy using proximity utility
    if (!checkProximity(puck, enemy, 10)) return; // Not actually hitting
    
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
    // Floating damage number using shared utility (RotMG style)
    spawnFloatingText(this, x, y - 10, "1", {
      fontSize: "10px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2,
      distance: 15,
      duration: 600,
      depth: 50,
      ease: "Power2",
    });
  }
  
  private enemyDefeated(enemy: Phaser.GameObjects.Container) {
    const enemyX = enemy.x;
    const enemyY = enemy.y;
    
    // Crowd celebration (from left stands)
    const celebMessages = ["Score!", "Great\nshot!", "Yes!", "He got\none!"];
    const msg = celebMessages[Math.floor(Math.random() * celebMessages.length)];
    this.spawnCrowdChatter(msg);
    
    // Particle explosion (RotMG style death burst)
    this.createDeathParticles(enemyX, enemyY);
    
    // Remove enemy
    enemy.destroy();
    const index = this.enemies.indexOf(enemy);
    if (index > -1) this.enemies.splice(index, 1);
    
    // Update score (RotMG stat format)
    this.enemiesDefeated++;
    this.scoreDisplay.setText(`KIL  ${this.enemiesDefeated}/${this.totalEnemies}`);
    
    // Flash score on kill (green like RotMG stat boost)
    this.scoreDisplay.setColor("#00ff00");
    this.time.delayedCall(200, () => {
      this.scoreDisplay.setColor("#ffffff");
    });
    
    // Check if ALL enemies defeated
    if (this.enemies.length === 0) {
      if (this.enemyWave === 0) {
        this.enemyWave = 1;
        this.totalEnemies = 6;
        this.scoreDisplay.setText(`KIL  ${this.enemiesDefeated}/${this.totalEnemies}`);
        this.spawnCrowdChatter("Second\nwave!");
        this.time.delayedCall(900, () => this.spawnEnemies(1.35));
        return;
      }

      // All enemies defeated! Spawn THE memory fragment at center ice
      this.time.delayedCall(500, () => {
        this.spawnMemoryFragment();
      });
    }
  }
  
  private createDeathParticles(x: number, y: number) {
    // RotMG-style particle burst using shared utility
    createParticleBurst(this, x, y, {
      particleCount: 8,
      colors: [0x1a1a1a, 0xff0000, 0xffffff, 0x666666],
      distance: 20,
      duration: 400,
      size: 3,
      sizeVariation: 0,
      ease: "Power2",
      shape: 'rectangle',
      depth: 20,
    });
  }
  
  private spawnMemoryFragment() {
    if (this.memoryFragmentSpawned) return;
    this.memoryFragmentSpawned = true;
    
    // Stop player movement
    this.playerPhysics.setVelocity(0, 0);
    
    const fragmentX = ICE_HOCKEY_SCREEN_CENTER_X + ICE_HOCKEY_WORLD_OFFSET_X;
    const fragmentY = 15 + ICE_HOCKEY_WORLD_OFFSET_Y;
    
    console.log('Spawning memory at:', fragmentX, fragmentY);
    console.log('Player currently at:', this.playerPhysics.x, this.playerPhysics.y);
    
    // Use the card piece sprite (now fixed to work with positioning)
    this.memoryFragment = createCardPieceSprite(this, fragmentX, fragmentY);
    this.memoryFragment.setDepth(20);
    this.worldContainer.add(this.memoryFragment);
    
    console.log('Memory fragment created at:', this.memoryFragment.x, this.memoryFragment.y);
    console.log('Memory fragment visible:', this.memoryFragment.visible);
    
    // Add sparkle effect after a small delay so it doesn't look like immediate collection
    this.time.delayedCall(300, () => {
      spawnCardPieceSparkles(this, fragmentX, fragmentY);
    });
    
    this.showDialog("All opponents defeated! Skate to the goal and touch the memory!");
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
    // Crowd warning about incoming chaser (from left stands)
    const warnMessages = ["Behind you!", "Incoming!", "Look out!"];
    const msg = warnMessages[Math.floor(Math.random() * warnMessages.length)];
    this.spawnCrowdChatter(msg);
    
    // Random spawn from sides with taunting text
    const ox = ICE_HOCKEY_WORLD_OFFSET_X;
    const oy = ICE_HOCKEY_WORLD_OFFSET_Y;
    const spawns = [
      { x: 90 + ox, y: 90 + oy, text: "You're mine!" },
      { x: 230 + ox, y: 90 + oy, text: "Get him!" },
      { x: 160 + ox, y: 15 + oy, text: "No escape!" },
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
    this.worldContainer.add(tauntText);
    this.worldContainer.add(chaser);
    
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
      if (checkProximity(chaser, this.playerPhysics, 15)) {
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
    this.updateHealthHearts(); // Update visual hearts
    
    // Crowd reaction to hit (from left stands)
    const hitMessages = ["Ouch!", "Watch out!", "Get up!", "Careful!"];
    const msg = hitMessages[Math.floor(Math.random() * hitMessages.length)];
    this.spawnCrowdChatter(msg);
    
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
