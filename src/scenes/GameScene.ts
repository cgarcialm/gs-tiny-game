import Phaser from "phaser";
import { createGraysonSprite, updateGraysonWalk, createEboshiSprite, createEboshiWithSweaterSprite, createSmushSprite, createCeciSprite, createCardPieceSprite, spawnCardPieceSparkles, createVanSideSprite } from "../utils/sprites";
import { createCrowdPersonSprite, getRandomCrowdColors } from "../utils/sprites/CrowdPersonSprite";
import { getHorizontalAxis, getVerticalAxis, shouldCloseDialogue, HELP_HINT_X, HELP_HINT_Y } from "../utils/controls";
import type { GameControls } from "../utils/controls";
import { HelpMenu } from "../utils/helpMenu";
import { PauseMenu } from "../utils/pauseMenu";
import { DialogueManager } from "../utils/dialogueManager";
import { handleMenuInput } from "../utils/menuHandler";
import { initializeGameScene } from "../utils/sceneSetup";
import { fadeToScene } from "../utils/sceneTransitions";
import { DEBUG_START_LEVEL } from "../config/debug";
import { PROMPT_TEXT_STYLE, HELP_HINT_TEXT_STYLE, FLOATING_MESSAGE_STYLE, COUNTER_TEXT_STYLE } from "../config/textStyles";
import { spawnFloatingText } from "../utils/visualEffects";
import { checkProximity } from "../utils/collectionHelpers";
import { animateCounterUpdate } from "../utils/uiAnimations";
import { GameStateManager } from "../managers/GameStateManager";
import { SCENES, VOID_LEVELS } from "../config/sceneConstants";

type DialogueState = "idle" | "open";
type ChaseState = "idle" | "chasing";

export default class GameScene extends Phaser.Scene {
  private gameState!: GameStateManager;
  private controls!: GameControls;
  private helpMenu!: HelpMenu;
  private pauseMenu!: PauseMenu;
  private dialogueManager!: DialogueManager;
  // @ts-ignore - CheatConsole used for side effects
  private _cheatConsole: any;

  private player!: Phaser.GameObjects.Container;
  private npc!: Phaser.GameObjects.Container;
  private cat!: Phaser.GameObjects.Container;
  private ceci!: Phaser.GameObjects.Container;
  private cardPiece!: Phaser.GameObjects.Graphics;
  private cardSparkles: Phaser.GameObjects.Text[] = [];
  
  private isJumping = false;
  private playerBaseY = 0;
  
  private completedLevels = 0; // 0 = none, 1 = Northgate, 2 = Level2, etc.
  private sceneGeneration = 0; // Incremented on each create() to invalidate old listeners
  
  // Stadium transformation
  private isTransformingToStadium = false;
  private transformationTime = 0;
  private crowdPeople: Phaser.GameObjects.Container[] = [];
  private stadiumElements: Phaser.GameObjects.GameObject[] = [];

  private speed = 80; // px/s
  private promptText!: Phaser.GameObjects.Text;
  private cardCounterText!: Phaser.GameObjects.Text;
  private helpHintText!: Phaser.GameObjects.Text;

  // dialogue state
  private dialogState: DialogueState = "idle";
  
  // Level 0 dialogues - Eboshi
  private eboshiDialogLines: string[] = [
    "Grayson! You look... different. More defined! Have you been working out?",
    "Alright, any peanut butter? No? Well, there's a card piece over there...",
    "*suddenly looks worried* Oh no... I hear something... RUN!!"
  ];
  
  // Level 1 dialogues - Ceci
  private ceciDialogLines: string[] = [
    "Ceci: Hey! I found another piece of the card!",
  ];
  
  private currentDialogLines: string[] = [];
  private dialogIndex = 0;
  
  // Chase sequence
  private chaseState: ChaseState = "idle";
  private catHasAppeared = false;
  private chaseTime = 0;
  private meowTexts: Phaser.GameObjects.Text[] = [];
  
  // Level 2 transition flag
  private waitingForSeattleTrafficTransition = false;
  
  // Card piece tracking
  private cardPieceCollected = false;
  private cardPieceX = 120;
  private cardPieceY = 130;
  
  // Dialogue blocking (for auto-dismiss only dialogues)
  private isDialogueAutoOnly = false;
  private cardPiecesCollected = 0;
  
  // Interaction tracking
  private hasInteractedWithEboshi = false;
  private ceciGaveMemory = false;
  private ceciCardPieceShown = false;
  
  // Image popup
  private imagePopup!: Phaser.GameObjects.Container;
  private photoOverlay?: HTMLDivElement;
  private hockeyOverlay?: HTMLDivElement;
  private popupMessageText!: Phaser.GameObjects.Text;
  private popupVisible = false;
  private currentPopupImage = 1; // 1 = hinge screenshot, 2 = hockey chat

  constructor() {
    super("Game");
  }

  create() {
    // Increment scene generation to invalidate old event listeners
    this.sceneGeneration++;
    
    // Clean up any leftover HTML overlays from previous runs
    if (this.photoOverlay && this.photoOverlay.parentElement) {
      this.photoOverlay.remove();
      this.photoOverlay = undefined;
    }
    if (this.hockeyOverlay && this.hockeyOverlay.parentElement) {
      this.hockeyOverlay.remove();
      this.hockeyOverlay = undefined;
    }
    
    // Clear arrays of game objects (they'll be recreated)
    this.cardSparkles = [];
    this.meowTexts = [];
    this.crowdPeople = [];
    this.stadiumElements = [];
    
    // Initialize common scene elements (camera, controls, menus, dialogue, cheat console)
    const setup = initializeGameScene(this);
    this.controls = setup.controls;
    this.helpMenu = setup.helpMenu;
    this.pauseMenu = setup.pauseMenu;
    this.dialogueManager = setup.dialogueManager;
    this.gameState = setup.gameState;
    // @ts-ignore - CheatConsole used for side effects (global keyboard listener)
    this._cheatConsole = setup.cheatConsole;
    
    // Reset transition flags and dialogue state
    this.waitingForSeattleTrafficTransition = false;
    this.isDialogueAutoOnly = false;
    this.dialogState = "idle";
    this.chaseState = "idle";
    this.catHasAppeared = false;
    this.hasInteractedWithEboshi = false;
    this.cardPieceCollected = false;
    this.ceciGaveMemory = false;
    this.ceciCardPieceShown = false;
    this.popupVisible = false;
    this.isTransformingToStadium = false;
    this.transformationTime = 0;

    // Pixel grid background (procedural)
    // More intense blue background with bright green thin grid lines
    this.createCustomGrid();
    
    // Get completed levels
    const registryLevel = this.gameState.getCompletedLevels();
    const fromTitleScene = this.gameState.isFromTitleScene(); // Auto-clears flag
    const isProduction = import.meta.env.PROD;
    
    if (isProduction) {
      // Production: Always use registry or 0
      this.completedLevels = registryLevel !== undefined && registryLevel !== null ? registryLevel : 0;
    } else {
      // Development: DEBUG_START_LEVEL only applies if registry is empty/0 AND not coming from TitleScene
      // Once you start progressing, registry takes over
      if ((registryLevel === undefined || registryLevel === null || registryLevel === 0) && DEBUG_START_LEVEL && !fromTitleScene) {
        this.completedLevels = DEBUG_START_LEVEL;
        console.log(`[DEBUG] Starting at level ${DEBUG_START_LEVEL} (initial load)`);
      } else {
        this.completedLevels = registryLevel || 0;
        if (registryLevel && !fromTitleScene) {
          console.log(`[DEBUG] Using registry level ${registryLevel} (progression)`);
        } else if (fromTitleScene) {
          console.log(`[DEBUG] Starting from Title scene at level 0`);
        }
      }
    }

    // Setup scene based on completed levels
    this.setupSceneForLevel(this.completedLevels);

    // "Press E to interact" prompt (hidden by default)
    this.promptText = this.add
      .text(0, 0, "E to interact", PROMPT_TEXT_STYLE)
      .setOrigin(0.5)
      .setVisible(false);

    // Card piece counter at top right of screen
    // Set initial count based on actual memories collected
    // Level 0 (Eboshi) = 1st, Level 1 (Ceci) = 2nd, Level 3 (Smush) = 3rd, Level 4 (Shuffle) = 4th
    if (this.completedLevels === 0) {
      this.cardPiecesCollected = 0; // Haven't collected any yet
    } else if (this.completedLevels === 1) {
      this.cardPiecesCollected = 1; // Collected from Eboshi
    } else if (this.completedLevels === 2) {
      this.cardPiecesCollected = 2; // Collected Eboshi + Ceci
    } else if (this.completedLevels === 3) {
      this.cardPiecesCollected = 2; // Same (level 2 has no memory)
    } else {
      this.cardPiecesCollected = 3; // Level 4: Have Eboshi + Ceci + Smush
    }
    
    // Memory counter at top right
    this.cardCounterText = this.add
      .text(310, 8, `Memories: ${this.cardPiecesCollected}/4`, COUNTER_TEXT_STYLE)
      .setOrigin(1, 0)
      .setDepth(10);
  
  // Help hint (bottom-right corner) - shown after first Eboshi interaction in level 0
  this.helpHintText = this.add
    .text(HELP_HINT_X, HELP_HINT_Y, "H for Help", HELP_HINT_TEXT_STYLE)
    .setOrigin(1, 1)
    .setDepth(10);
    
    // Auto-unlock help hint if at level 1+ (must have completed level 0)
    if (this.completedLevels >= 1 && !this.gameState.isHelpHintUnlocked()) {
      this.gameState.unlockHelpHint();
    }
    
    // Show help hint: Always show in levels 1+, or if unlocked in level 0
    const showHelpHint = this.completedLevels >= 1 || this.gameState.isHelpHintUnlocked();
    this.helpHintText.setVisible(showHelpHint);
    
    // Create image popup (hidden initially)
    this.createImagePopup();
  }

  private setupSceneForLevel(level: number) {
    switch (level) {
      case 0:
        // Level 0: First time in the void - Eboshi encounter
        this.player = createGraysonSprite(this, 160, 90);
        
        this.npc = createEboshiSprite(this, 220, 95);
        this.npc.setScale(1, 1);
        
        this.cat = createSmushSprite(this, -50, 95);
        this.cat.setVisible(false);
        
        // Card piece on the floor for level 0 - hidden initially
        this.cardPiece = createCardPieceSprite(this, 120, 130);
        this.cardPiece.setVisible(false);
        
        // Set dialogue lines for this level
        this.currentDialogLines = this.eboshiDialogLines;
        
        // Ensure other level NPCs don't exist
        this.ceci = undefined as any;
        break;
        
      case 1:
        // Level 1: After Northgate - Return with Ceci
        this.player = createGraysonSprite(this, 350, 90);
        this.ceci = createCeciSprite(this, 380, 90);
        
        // Set dialogue lines for this level
        this.currentDialogLines = this.ceciDialogLines;
        
        // Clean up level 0 NPCs and objects - they shouldn't exist in this level
        this.npc = undefined as any;
        this.cat = undefined as any;
        this.cardPiece = undefined as any;
        
        // Walk in together
        this.tweens.add({
          targets: this.player,
          x: 160,
          duration: 2000,
          ease: "Linear",
          onComplete: () => {
            // After entering, Ceci gives Grayson the memory
            this.time.delayedCall(500, () => {
              this.ceciGivesMemory();
            });
          }
        });
        
        this.tweens.add({
          targets: this.ceci,
          x: 190,
          duration: 2000,
          ease: "Linear"
        });
        break;
        
      case 2:
        // Level 2: After Ice Hockey - Seattle Traffic memory intro
        // Full animated scene: card pickup -> van emerges -> loading scene -> drive off
        this.player = createGraysonSprite(this, -30, 90);
        this.player.setScale(-1, 1); // Face right
        
        // Card piece on floor (to the right)
        this.cardPiece = createCardPieceSprite(this, 200, 110);
        this.cardPiece.setVisible(true);
        
        // No other NPCs initially
        this.npc = undefined as any;
        this.cat = undefined as any;
        this.ceci = undefined as any;
        
        // Grayson walks in to left of card
        this.time.delayedCall(500, () => {
          const walkTimer = this.time.addEvent({
            delay: 150,
            repeat: 12,
            callback: () => updateGraysonWalk(this.player, true)
          });
          
          this.tweens.add({
            targets: this.player,
            x: 160,
            duration: 2000,
            ease: "Linear",
            onComplete: () => {
              walkTimer.destroy();
              this.startSeattleTrafficIntro();
            }
          });
        });
        break;
        
      case 3:
        // Level 3: After Seattle Traffic - Smush playing with memories!
        // Grayson starts off-screen right
        this.player = createGraysonSprite(this, 340, 90);
        this.player.setScale(1, 1); // Face left
        
        // Smush on left side, looking down at card pieces
        this.cat = createSmushSprite(this, 80, 90);
        this.cat.setData('lookingDown', true);
        this.cat.setData('playingWithPieces', true);
        
        // Redraw sprite with looking down pupils
        const redraw3 = this.cat.getData('redraw');
        if (redraw3) redraw3();
        
        // Two card pieces sliding around (Smush batting them)
        this.setupSmushPlayingScene();
        
        // Grayson walks in from right to center
        this.time.delayedCall(500, () => {
          // Animate walking
          const walkTimer = this.time.addEvent({
            delay: 150,
            repeat: 12,
            callback: () => {
              updateGraysonWalk(this.player, true);
            }
          });
          
          this.tweens.add({
            targets: this.player,
            x: 160,
            duration: 2000,
            ease: "Linear",
            onComplete: () => {
              walkTimer.destroy();
              // Arrived - dialogue triggers from setupSmushPlayingScene at 3s mark
            }
          });
        });
        break;
        
      case 4:
        // Level 4: After Farmers Market - Final memory complete!
        // Clean scene - only Grayson (positioned lower for void transition)
        this.player = createGraysonSprite(this, -30, 105);
        this.player.setScale(-1, 1); // Face right
        
        // No other NPCs or objects
        this.npc = undefined as any;
        this.cat = undefined as any;
        this.ceci = undefined as any;
        this.cardPiece = undefined as any;
        
        // Grayson walks in from left to center
        this.time.delayedCall(500, () => {
          // Animate walking
          const walkTimer = this.time.addEvent({
            delay: 150,
            repeat: 12,
            callback: () => {
              updateGraysonWalk(this.player, true);
            }
          });
          
          this.tweens.add({
            targets: this.player,
            x: 155,
            duration: 2000,
            ease: "Linear",
            onComplete: () => {
              walkTimer.destroy();
              
              // After walking in, start shuffle game (don't increment counter yet)
              this.time.delayedCall(500, () => {
                // Start card shuffling mini-game (winning this gives the 4th memory)
                this.time.delayedCall(800, () => {
                  this.startCardShuffleGame();
                });
              });
            }
          });
        });
        break;
        
      // Add more cases for future levels
      default:
        this.player = createGraysonSprite(this, 160, 90);
        break;
    }
  }
  
  private createCustomGrid() {
    const gridWidth = 320;
    const gridHeight = 180;
    const cellSize = 16;
    const bgColor = 0x003d4d; // Dark neon cyan background - classic Tron-like aesthetic
    const lineColor = 0xff00ff; // Bright neon magenta/pink grid (doesn't overlap with green shirt)
    const lineAlpha = 0.5; // More visible neon grid lines
    
    // Background rectangle
    const bg = this.add.rectangle(160, 90, gridWidth, gridHeight, bgColor, 1);
    bg.setOrigin(0.5);
    
    // Grid lines using Graphics as 1px rectangles for crisp rendering
    const graphics = this.add.graphics();
    const startX = Math.round(160 - gridWidth / 2);
    const startY = Math.round(90 - gridHeight / 2);
    
    graphics.fillStyle(lineColor, lineAlpha);
    
    // Vertical lines (1px wide)
    for (let x = 0; x <= gridWidth; x += cellSize) {
      const vx = Math.round(startX + x);
      graphics.fillRect(vx, startY, 1, gridHeight);
    }
    
    // Horizontal lines (1px tall)
    for (let y = 0; y <= gridHeight; y += cellSize) {
      const hy = Math.round(startY + y);
      graphics.fillRect(startX, hy, gridWidth, 1);
    }
  }

  private showDialog(line: string) {
    this.dialogState = "open";
    this.dialogueManager.show(line);
  }

  private hideDialog() {
    this.dialogState = "idle";
    this.dialogueManager.hide();
    
    // Show help hint after first dialogue with Eboshi (level 0)
    if (this.completedLevels === VOID_LEVELS.EBOSHI_ENCOUNTER && this.hasInteractedWithEboshi) {
      this.gameState.unlockHelpHint();
      this.helpHintText.setVisible(true);
    }
  }

  private advanceDialog() {
    this.dialogIndex++;
    
    // Level 0: Show card piece when Eboshi mentions it (dialogue line 1)
    if (this.completedLevels === 0 && this.dialogIndex === 1 && this.cardPiece) {
      this.cardPiece.setVisible(true);
      const sparkles = spawnCardPieceSparkles(this, 120, 130);
      this.cardSparkles.push(...sparkles);
    }
    
    if (this.dialogIndex >= this.currentDialogLines.length) {
      this.dialogIndex = 0;
      this.hideDialog();
      
      // Level 0: Trigger cat chase after Eboshi dialogue ends
      if (this.completedLevels === 0 && !this.catHasAppeared) {
        this.startCatChase();
      }
      
      // Level 1: Show card piece after Ceci dialogue ends
      if (this.completedLevels === 1) {
        this.showCeciCardPiece();
      }
    } else {
      this.showDialog(this.currentDialogLines[this.dialogIndex]);
    }
  }
  
  private startCatChase() {
    if (!this.cat || !this.npc) return; // Only on first visit
    
    this.catHasAppeared = true;
    this.chaseState = "chasing";
    this.chaseTime = 0;
    
    // Show the cat and position it off-screen left
    this.cat.setVisible(true);
    this.cat.x = -50;
    this.cat.y = 95;
    this.cat.setScale(-1, 1); // Face right (chasing to the right)
    
    // Make dog face right (running to the right)
    this.npc.setScale(-1, 1);
  }
  
  private spawnMeowText(x: number, y: number) {
    // Use shared floating text utility
    const meowText = spawnFloatingText(this, x, y, "MEOW!", {
      fontSize: "12px",
      color: "#ffeb3b",
      fontStyle: "bold",
      distance: 30,
      duration: 1000,
      ease: "Power2",
    });
    
    this.meowTexts.push(meowText);
    
    // Clean up from array when destroyed (handled by setTimeout since tween destroys it)
    this.time.delayedCall(1100, () => {
      const index = this.meowTexts.indexOf(meowText);
      if (index > -1) {
        this.meowTexts.splice(index, 1);
      }
    });
  }

  update() {
    const dt = this.game.loop.delta / 1000;

    // Handle menu input (ESC for pause, H for help, M for mute)
    if (handleMenuInput(this, this.controls, this.helpMenu, this.pauseMenu, undefined, this._cheatConsole, this.gameState)) {
      return; // Menus are active, don't process game input
    }

    // Handle image popup
    if (this.popupVisible) {
      if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
        if (this.currentPopupImage === 1) {
          this.showNextImage();
        } else {
          // After second image, go to Northgate Station
          this.hideImagePopup();
          this.scene.start(SCENES.NORTHGATE);
        }
      }
      if (Phaser.Input.Keyboard.JustDown(this.controls.escape)) {
        this.hideImagePopup();
      }
      return;
    }

    // Handle chase sequence
    if (this.chaseState === "chasing") {
      this.updateChaseSequence(dt);
      return;
    }
    
    // Handle stadium transformation (no player control)
    if (this.isTransformingToStadium) {
      this.transformationTime += dt;
      // No player input during transformation
      return;
    }

    // If in dialogue, only allow closing/advancing; no movement
    if (this.dialogState === "open" || this.dialogueManager.isVisible()) {
      if (shouldCloseDialogue(this.controls)) {
        if (this.dialogState === "open") {
          this.advanceDialog();
        } else if (!this.isDialogueAutoOnly) {
          // Only allow manual close if not auto-only dialogue
          this.dialogueManager.hide();
          
          // Check if we should transition to Seattle Traffic (level 2)
          if (this.waitingForSeattleTrafficTransition) {
            this.waitingForSeattleTrafficTransition = false;
            fadeToScene(this, SCENES.SEATTLE_TRAFFIC, 1000);
          }
        }
      }
      return;
    }
    
    // Level 3: Check for collecting moving pieces from Smush
    if (this.completedLevels === 3 && this.cardPiece && this.cardPiece.getData('isMovingPiece')) {
      this.checkSmushPieceCollection();
    }

    // Movement (WASD + arrow keys) - disabled in level 4 (card shuffle game)
    if (this.completedLevels !== 4) {
      let vx = getHorizontalAxis(this, this.controls);
      let vy = getVerticalAxis(this, this.controls);

      const isMoving = vx !== 0 || vy !== 0;
      
      if (isMoving) {
        const len = Math.hypot(vx, vy);
        vx /= len;
        vy /= len;
        
        // Flip sprite based on horizontal movement direction
        if (vx < 0) {
          this.player.setScale(1, 1);  // Face left
        } else if (vx > 0) {
          this.player.setScale(-1, 1); // Face right
        }
      }
      this.player.x += vx * this.speed * dt;
      this.player.y += vy * this.speed * dt;
      
      // Jump/hop when space is pressed
      if (Phaser.Input.Keyboard.JustDown(this.controls.jump) && !this.isJumping) {
        this.isJumping = true;
        this.playerBaseY = this.player.y;
        
        // Small hop animation
        this.tweens.add({
          targets: this.player,
          y: this.player.y - 15, // Hop up 15 pixels
          duration: 200,
          ease: "Quad.easeOut",
          yoyo: true,
          onComplete: () => {
            this.isJumping = false;
            this.player.y = this.playerBaseY;
          }
        });
      }
      
      // Round player position to prevent sub-pixel transparency issues
      this.player.x = Math.round(this.player.x);
      this.player.y = Math.round(this.player.y);

      // Keep inside 320x180 play area (tiny padding)
      this.player.x = Phaser.Math.Clamp(this.player.x, 6, 320 - 6);
      this.player.y = Phaser.Math.Clamp(this.player.y, 6, 180 - 6);
      
      // Update walking animation
      updateGraysonWalk(this.player, isMoving);
    }

    // Level 0: Proximity check to NPC (Eboshi) - only on level 0
    if (this.completedLevels === 0 && this.npc && this.npc.visible) {
      const near = checkProximity(this.player, this.npc, 50); // distance threshold to show prompt
      
      // Only show prompt if haven't interacted yet
      if (near && !this.hasInteractedWithEboshi) {
        this.promptText.setVisible(true);
        // anchor prompt above NPC
        this.promptText.setPosition(this.npc.x, this.npc.y - 14);

        // Press E to interact
        if (Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
          this.hasInteractedWithEboshi = true;
          this.dialogIndex = 0;
          this.showDialog(this.currentDialogLines[this.dialogIndex]);
          this.promptText.setVisible(false); // Hide prompt once player interacts
        }
      } else if (!near || this.hasInteractedWithEboshi) {
        this.promptText.setVisible(false);
      }
      
      // Still allow interaction even if prompt is hidden
      if (near && this.hasInteractedWithEboshi) {
        if (Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
          this.dialogIndex = 0;
          this.showDialog(this.currentDialogLines[this.dialogIndex]);
        }
      }
    }
    
    // Level 0: Proximity check to card piece (if visible and not collected)
    if (this.completedLevels === 0 && this.cardPiece && this.cardPiece.visible && !this.cardPieceCollected) {
      const nearCard = checkProximity(
        this.player,
        { x: this.cardPieceX, y: this.cardPieceY },
        30
      ); // distance threshold for card
      
      // Allow picking up card when near (no prompt - player already knows to press E)
      if (nearCard && Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
        this.pickUpCardPiece();
      }
    }
  }
  
  private pickUpCardPiece() {
    if (!this.cardPiece) return; // Safety check
    
    this.cardPieceCollected = true;
    this.cardPiece.setVisible(false);
    this.promptText.setVisible(false);
    
    // Update counter with animation
    this.cardPiecesCollected++;
    this.updateMemoryCounter();
    
    // Spawn celebration sparkles
    const sparkles = spawnCardPieceSparkles(this, this.cardPieceX, this.cardPieceY);
    
    // Show pickup message
    const pickupText = this.add.text(this.cardPieceX, this.cardPieceY - 20, "Memory collected!", FLOATING_MESSAGE_STYLE)
      .setOrigin(0.5);
    
    // Animate message floating up and fading
    this.tweens.add({
      targets: pickupText,
      y: this.cardPieceY - 40,
      alpha: 0,
      duration: 1500,
      ease: "Power2",
      onComplete: () => {
        pickupText.destroy();
        // Show image popup after pickup animation
        this.showImagePopup();
      }
    });
    
    // Clean up sparkles
    sparkles.forEach(sparkle => {
      this.cardSparkles.push(sparkle);
    });
  }
  
  private createImagePopup() {
    this.imagePopup = this.add.container(0, 0);
    this.imagePopup.setDepth(100);
    
    // Semi-transparent background overlay
    const overlay = this.add.rectangle(160, 90, 320, 180, 0x000000, 0.8);
    overlay.setOrigin(0.5);
    
    // Message text (on the left side)
    this.popupMessageText = this.add.text(90, 90, "look at you all flirty", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ff66ff",
      fontStyle: "bold italic",
      align: "center",
      resolution: 1,
    }).setOrigin(0.5);
    
    this.imagePopup.add([overlay, this.popupMessageText]);
    this.imagePopup.setVisible(false);
    
    // Create HTML overlays for photos (completely outside Phaser)
    this.createPhotoOverlay();
    this.createHockeyOverlay();
  }
  
  private createPhotoOverlay() {
    // Create a div overlay with the photo
    this.photoOverlay = document.createElement('div');
    this.photoOverlay.style.position = 'absolute';
    this.photoOverlay.style.top = '50%';
    this.photoOverlay.style.left = '50%';
    this.photoOverlay.style.transform = 'translate(-50%, -50%)';
    this.photoOverlay.style.zIndex = '1000';
    this.photoOverlay.style.display = 'none';
    this.photoOverlay.style.pointerEvents = 'none';
    
    // Create image element
    const img = document.createElement('img');
    img.src = 'hinge-screenshot.png';
    img.style.maxWidth = '55%';
    img.style.maxHeight = '90%';
    img.style.border = '3px solid #ff66ff';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 0 20px rgba(255, 102, 255, 0.5)';
    img.style.imageRendering = 'auto';
    img.style.display = 'block';
    img.style.marginLeft = '70%'; // Offset to the right
    
    this.photoOverlay.appendChild(img);
    document.body.appendChild(this.photoOverlay);
  }
  
  private createHockeyOverlay() {
    // Create a div overlay for ice hockey chat
    this.hockeyOverlay = document.createElement('div');
    this.hockeyOverlay.style.position = 'absolute';
    this.hockeyOverlay.style.top = '50%';
    this.hockeyOverlay.style.left = '50%';
    this.hockeyOverlay.style.transform = 'translate(-50%, -50%)';
    this.hockeyOverlay.style.zIndex = '1000';
    this.hockeyOverlay.style.display = 'none';
    this.hockeyOverlay.style.pointerEvents = 'none';
    
    // Create image element
    const img = document.createElement('img');
    img.src = 'ice-hockey-chat.png';
    img.style.maxWidth = '55%';
    img.style.maxHeight = '90%';
    img.style.border = '3px solid #ff66ff';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 0 20px rgba(255, 102, 255, 0.5)';
    img.style.imageRendering = 'auto';
    img.style.display = 'block';
    img.style.marginLeft = '55%'; // Offset to the right
    
    this.hockeyOverlay.appendChild(img);
    document.body.appendChild(this.hockeyOverlay);
  }
  
  private showImagePopup() {
    this.popupVisible = true;
    this.currentPopupImage = 1;
    this.imagePopup.setVisible(true);
    if (this.photoOverlay) {
      this.photoOverlay.style.display = 'block';
    }
    if (this.hockeyOverlay) {
      this.hockeyOverlay.style.display = 'none';
    }
  }
  
  private ceciGivesMemory() {
    if (this.ceciGaveMemory) return;
    this.ceciGaveMemory = true;
    
    // Start Ceci's dialogue (will advance with ENTER/SPACE)
    this.dialogIndex = 0;
    this.showDialog(this.currentDialogLines[this.dialogIndex]);
  }
  
  // Seattle Traffic intro - van loading scene
  private seattleVan?: Phaser.GameObjects.Container;
  private seattleEbo?: Phaser.GameObjects.Container;
  private seattleCeci?: Phaser.GameObjects.Container;
  
  private startSeattleTrafficIntro() {
    const generation = this.sceneGeneration;
    let pickedUp = false;
    
    const checkPickup = () => {
      if (generation !== this.sceneGeneration || pickedUp) return;
      
      if (Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
        pickedUp = true;
        this.events.off('update', checkPickup);
        
        // Move Grayson to the left first so van doesn't cover him
        this.tweens.add({
          targets: this.player,
          x: 100,
          duration: 500,
          ease: "Sine.easeOut",
          onComplete: () => {
            this.showVanFromMemory();
          }
        });
      }
    };
    this.events.on('update', checkPickup);
  }
  
  private showVanFromMemory() {
    // Van starts at card position (right side), very small
    this.seattleVan = createVanSideSprite(this, 200, 110);
    this.seattleVan.setScale(0.05);
    this.seattleVan.setDepth(4); // Behind card initially
    
    // Scale up while moving up (van emerging from card)
    this.tweens.add({
      targets: this.seattleVan,
      scale: 0.8,
      y: 80,
      duration: 1000,
      ease: "Power2.easeOut",
      onStart: () => {
        // Bring van to front as it emerges
        this.time.delayedCall(200, () => {
          this.seattleVan?.setDepth(10);
        });
      },
      onComplete: () => {
        // Then sparkles
        spawnCardPieceSparkles(this, 200, 110);
        
        // Card disappears
        this.cardPiece?.destroy();
        this.cardPiecesCollected++;
        this.updateMemoryCounter();
        
        // "Memory collected!" text
        const pickupText = this.add.text(200, 70, "Memory collected!", FLOATING_MESSAGE_STYLE)
          .setOrigin(0.5);
        this.tweens.add({
          targets: pickupText,
          y: 65,
          alpha: 0,
          duration: 1200,
          ease: "Power2",
          onComplete: () => {
            pickupText.destroy();
            // Move van to right side, Grayson waits by it
            this.time.delayedCall(300, () => {
              this.setupLoadingScene();
            });
          }
        });
      }
    });
  }
  
  private setupLoadingScene() {
    // Move van to right side
    this.tweens.add({
      targets: this.seattleVan,
      x: 220,
      y: 100,
      scale: 1,
      duration: 800,
      ease: "Sine.easeInOut"
    });
    
    // Grayson moves to back of van and waits (face left, looking impatient)
    const walkTimer = this.time.addEvent({
      delay: 150,
      repeat: 8,
      callback: () => updateGraysonWalk(this.player, true)
    });
    
    this.tweens.add({
      targets: this.player,
      x: 165,
      duration: 1200,
      ease: "Linear",
      onComplete: () => {
        walkTimer.destroy();
        this.player.setScale(1, 1); // Face left (waiting for Ceci)
        
        // Ceci and Ebo run in from left
        this.time.delayedCall(800, () => {
          this.ceciAndEboArrive();
        });
      }
    });
  }
  
  private seattleDialogueIndex = 0;
  
  private ceciAndEboArrive() {
    // Create only Ceci first - Ebo arrives later
    this.seattleCeci = createCeciSprite(this, -30, 95);
    this.seattleCeci.setScale(-1, 1); // Face right
    
    // Ceci runs in alone
    this.tweens.add({
      targets: this.seattleCeci,
      x: 100,
      duration: 1500,
      ease: "Linear",
      onComplete: () => {
        // Start dialogue sequence
        this.time.delayedCall(300, () => {
          this.seattleDialogueIndex = 0;
          this.showSeattleDialogue();
        });
      }
    });
  }
  
  private eboArrives() {
    // Create Ebo and have her run in (wearing sweater!)
    this.seattleEbo = createEboshiWithSweaterSprite(this, -60, 100);
    this.seattleEbo.setScale(-1, 1); // Face right
    
    // Ebo runs in to join Ceci
    this.tweens.add({
      targets: this.seattleEbo,
      x: 70,
      duration: 1200,
      ease: "Linear"
    });
  }
  
  private showSeattleDialogue() {
    const generation = this.sceneGeneration;
    
    if (this.seattleDialogueIndex === 0) {
      // Grayson: What took so long??
      this.dialogueManager.show("Grayson: What took so long??");
      const checkAdvance = () => {
        if (generation !== this.sceneGeneration) { this.events.off('update', checkAdvance); return; }
        if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
          this.events.off('update', checkAdvance);
          this.seattleDialogueIndex++;
          this.showSeattleDialogue();
        }
      };
      this.events.on('update', checkAdvance);
    } else if (this.seattleDialogueIndex === 1) {
      // Ceci: Ebo needed her sweater. - Ebo runs in wearing her sweater!
      this.isDialogueAutoOnly = true; // Block ENTER during Ebo's entrance
      this.dialogueManager.show("Ceci: Ebo needed her sweater.");
      this.eboArrives(); // Ebo appears when mentioned!
      
      // Allow dialogue dismiss after Ebo finishes her entrance (1200ms)
      this.time.delayedCall(1200, () => {
        this.isDialogueAutoOnly = false; // Allow ENTER now
        const checkAdvance = () => {
          if (generation !== this.sceneGeneration) { this.events.off('update', checkAdvance); return; }
          if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
            this.events.off('update', checkAdvance);
            this.dialogueManager.hide();
            // Ceci gets in the van
            this.ceciGetsInVan();
          }
        };
        this.events.on('update', checkAdvance);
      });
    } else if (this.seattleDialogueIndex === 2) {
      // Grayson: The hike is gonna be PACKED
      this.dialogueManager.show("Grayson: The hike is gonna be PACKED");
      const checkAdvance = () => {
        if (generation !== this.sceneGeneration) { this.events.off('update', checkAdvance); return; }
        if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
          this.events.off('update', checkAdvance);
          this.dialogueManager.hide();
          this.graysonGetsInVan();
        }
      };
      this.events.on('update', checkAdvance);
    }
  }
  
  private ceciGetsInVan() {
    // Ceci and Ebo move to van together
    this.tweens.add({
      targets: [this.seattleCeci, this.seattleEbo],
      x: 220,
      duration: 600,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.seattleCeci?.setVisible(false);
        this.seattleEbo?.setVisible(false);
        // Now Grayson says his line
        this.time.delayedCall(300, () => {
          this.seattleDialogueIndex = 2;
          this.showSeattleDialogue();
        });
      }
    });
  }
  
  private graysonGetsInVan() {
    // Turn Grayson to face right before getting in
    this.player.setScale(-1, 1);
    
    // Grayson moves to van
    this.tweens.add({
      targets: this.player,
      x: 220,
      duration: 800,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.player.setVisible(false);
        // Van drives off
        this.time.delayedCall(500, () => {
          this.vanDrivesOff();
        });
      }
    });
  }
  
  private vanDrivesOff() {
    // Van drives off to the right
    this.tweens.add({
      targets: this.seattleVan,
      x: 400,
      duration: 1500,
      ease: "Quad.easeIn",
      onComplete: () => {
        // Fade to Seattle Traffic
        fadeToScene(this, SCENES.SEATTLE_TRAFFIC, 1000);
      }
    });
  }
  
  private showCeciCardPiece() {
    if (this.ceciCardPieceShown) return; // Prevent showing twice
    this.ceciCardPieceShown = true;
    
    // Show card piece between Grayson and Ceci
    const cardX = (this.player.x + this.ceci.x) / 2;
    const cardY = 85;
    const ceciCardPiece = createCardPieceSprite(this, cardX, cardY);
    
    // Sparkles around card
    spawnCardPieceSparkles(this, cardX, cardY);
    
    // Wait for player to press E
    this.waitForCardPickup(ceciCardPiece, cardX, cardY);
  }
  
  private waitForCardPickup(cardPiece: Phaser.GameObjects.Graphics, cardX: number, cardY: number) {
    // Don't show "E to interact" prompt in level 1+
    // Player knows they can interact from previous levels
    
    let hasCollected = false; // Prevent double collection
    const generation = this.sceneGeneration; // Capture current generation
    
    // Check for E press in update
    const checkPickup = () => {
      if (generation !== this.sceneGeneration) {
        this.events.off('update', checkPickup); // Scene restarted, stop listening
        return;
      }
      if (hasCollected) return; // Already collected
      
      // Check proximity using utility
      if (checkProximity(this.player, { x: cardX, y: cardY }, 30) && 
          Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
        // Mark as collected immediately
        hasCollected = true;
        
        // Picked up!
        cardPiece.destroy();
        
        // Stop checking immediately
        this.events.off('update', checkPickup);
        
        // Memory collection animation
        this.cardPiecesCollected++;
        this.updateMemoryCounter();
        
        // "Memory collected!" message
        const pickupText = this.add.text(cardX, cardY, "Memory collected!", FLOATING_MESSAGE_STYLE)
          .setOrigin(0.5);
        
        this.tweens.add({
          targets: pickupText,
          y: cardY - 20,
          alpha: 0,
          duration: 1500,
          ease: "Power2",
          onComplete: () => {
            pickupText.destroy();
            // After memory animation, Ceci suggests hockey game
            this.ceciSuggestsHockey();
          }
        });
      }
    };
    
    this.events.on('update', checkPickup);
  }
  
  private ceciSuggestsHockey() {
    this.showDialog("Ceci: One of the many times we went to see the Silvertips :)");
    
    this.time.delayedCall(3000, () => {
      this.hideDialog();
      
      // Start transforming to stadium instead of fading
      this.time.delayedCall(500, () => {
        this.startStadiumTransformation();
      });
    });
  }
  
  private startStadiumTransformation() {
    this.isTransformingToStadium = true;
    this.transformationTime = 0;
    
    // Hide help hint during transformation
    this.helpHintText.setVisible(false);
    
    // Ensure player and Ceci are visible above stadium elements
    this.player.setDepth(6);
    if (this.ceci) {
      this.ceci.setDepth(6);
    }
    
    // Disable player movement during transformation
    // (handled in update loop by checking isTransformingToStadium)
    
    // Create simple stadium elements that fade in
    this.createStadiumConcourse();
    
    // Start spawning crowd after a moment
    this.time.delayedCall(1000, () => {
      this.spawnCrowd();
    });
  }
  
  private createStadiumConcourse() {
    // Fade out the void grid background to dark gray
    const overlay = this.add.rectangle(160, 90, 320, 180, 0x2a2a2a, 0);
    overlay.setDepth(1); // Above grid but below characters
    this.stadiumElements.push(overlay);
    
    this.tweens.add({
      targets: overlay,
      alpha: 0.9,
      duration: 1500,
      ease: "Power2"
    });
    
    // Add very thick stadium wall at top (ceiling)
    const wallHeight = 80;
    const topWall = this.add.rectangle(160, wallHeight / 2, 320, wallHeight, 0x4a4a4a, 1);
    topWall.setAlpha(0);
    topWall.setDepth(2); // Above overlay, below characters
    this.stadiumElements.push(topWall);
    
    // Bottom wall - a bit thicker (floor/lower wall)
    const bottomWall = this.add.rectangle(160, 172, 320, 16, 0x4a4a4a, 1);
    bottomWall.setAlpha(0);
    bottomWall.setDepth(2); // Same as top wall
    this.stadiumElements.push(bottomWall);
    
    // Fade in walls
    this.tweens.add({
      targets: [topWall, bottomWall],
      alpha: 1,
      duration: 1500,
      ease: "Power2"
    });
    
    // Add gate doors on the LEFT side - align BOTTOM of doors with BOTTOM of wall (y:80)
    const doorHeight = 60;
    const wallBottom = wallHeight; // Wall bottom at y:80
    const doorCenterY = wallBottom - (doorHeight / 2); // Door center at y:50 (80 - 30)
    
    const door203 = this.add.rectangle(50, doorCenterY, 35, doorHeight, 0x0d0d0d, 1);
    door203.setStrokeStyle(2, 0x888888);
    door203.setAlpha(0);
    door203.setDepth(3); // Above walls, below characters
    this.stadiumElements.push(door203);
    
    const doorLabel203 = this.add.text(50, doorCenterY - 5, "GATE\n203", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#ffeb3b",
      fontStyle: "bold",
      align: "center",
      lineSpacing: 1,
      resolution: 1,
    }).setOrigin(0.5).setAlpha(0);
    doorLabel203.setDepth(4); // Above doors
    this.stadiumElements.push(doorLabel203);
    
    const door204 = this.add.rectangle(100, doorCenterY, 35, doorHeight, 0x0d0d0d, 1);
    door204.setStrokeStyle(2, 0x888888);
    door204.setAlpha(0);
    door204.setDepth(3); // Above walls, below characters
    this.stadiumElements.push(door204);
    
    const doorLabel204 = this.add.text(100, doorCenterY - 5, "GATE\n204", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#ffeb3b",
      fontStyle: "bold",
      align: "center",
      lineSpacing: 1,
      resolution: 1,
    }).setOrigin(0.5).setAlpha(0);
    doorLabel204.setDepth(4); // Above doors
    this.stadiumElements.push(doorLabel204);
    
    // Add food shop sign - on the RIGHT side, pointing right
    const foodSign = this.add.text(290, 50, "SNACKS →", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#ff6666",
      backgroundColor: "#000000",
      padding: { left: 2, right: 2, top: 1, bottom: 1 },
      resolution: 1,
    }).setOrigin(0.5).setAlpha(0);
    foodSign.setDepth(3); // Above walls
    this.stadiumElements.push(foodSign);
    
    // Fade in signs and doors
    this.tweens.add({
      targets: [foodSign, door203, door204, doorLabel203, doorLabel204],
      alpha: 1,
      duration: 1500,
      delay: 500,
      ease: "Power2"
    });
  }
  
  private spawnCrowd() {
    // Spawn people walking from both sides at different speeds
    const numPeople = 25; // More people for a bigger crowd
    
    for (let i = 0; i < numPeople; i++) {
      const fromLeft = Math.random() > 0.5;
      const startX = fromLeft ? -20 : 340; // Start completely off screen
      const y = 80 + Math.random() * 70; // Random Y between 80-150 (below the wall)
      const speed = 30 + Math.random() * 50; // Speed 30-80
      const direction = fromLeft ? 1 : -1;
      
      // Stagger the spawns
      this.time.delayedCall(i * 150, () => {
        // Create person sprite with random colors
        const colors = getRandomCrowdColors();
        const person = createCrowdPersonSprite(this, startX, y, colors);
        person.setDepth(5); // Below Grayson/Ceci (6) but above walls (1-4)
        this.crowdPeople.push(person);
        
        // Move person across screen (already visible when they enter)
        this.tweens.add({
          targets: person,
          x: startX + direction * 400,
          duration: (400 / speed) * 1000,
          ease: "Linear",
          onComplete: () => {
            person.destroy();
            const index = this.crowdPeople.indexOf(person);
            if (index > -1) this.crowdPeople.splice(index, 1);
          }
        });
      });
    }
    
    // After crowd starts moving, Ceci gets lost
    this.time.delayedCall(2000, () => {
      this.ceciGetsLost();
    });
  }
  
  private ceciGetsLost() {
    // Move Ceci farther into the crowd and fade her out
    const direction = Math.random() > 0.5 ? 1 : -1; // Random direction
    const targetX = this.ceci.x + direction * 120; // Walk much farther
    
    this.tweens.add({
      targets: this.ceci,
      x: targetX,
      y: this.ceci.y + (Math.random() - 0.5) * 30,
      alpha: 0,
      duration: 2000, // Slower fade
      ease: "Power2"
    });
    
    // After Ceci disappears, Grayson looks around
    this.time.delayedCall(2200, () => {
      this.showDialog("Grayson: Ceci? Where did you go?!");
      
      // Make Grayson walk to the left looking for Ceci
      this.time.delayedCall(2500, () => { // Longer so player can read
        this.hideDialog();
        
        // Show dialogue as he starts moving
        this.time.delayedCall(300, () => {
          this.showDialog("Grayson: Oh boy... I need to find her!");
        });
        
        // Walk to the left while looking around
        this.player.setScale(1, 1); // Face left
        
        this.tweens.add({
          targets: this.player,
          x: -20, // Walk all the way off screen to the left
          duration: 3000,
          ease: "Linear",
          onComplete: () => {
                      // After Grayson exits, transition to Ice Hockey scene
                      this.time.delayedCall(1500, () => { // Short pause after exit
                        this.hideDialog();
                        fadeToScene(this, SCENES.ICE_HOCKEY, 800);
                      });
          }
        });
      });
    });
  }
  
  private updateMemoryCounter() {
    this.cardCounterText.setText(`Memories: ${this.cardPiecesCollected}/4`);
    
    // Use original fancy animation
    animateCounterUpdate(this, this.cardCounterText, {
      scaleTo: 1.5,
      scaleDuration: 400,
      flashColor: "#ffffff",
      flashDuration: 400,
      addSparkles: true,
      sparkleCount: 3,
      addGlow: true,
      glowScale: 2,
      glowDuration: 1500,
      ease: "Back.easeOut",
    });
  }

  private mergeCardsAnimation(allCards: any[], onComplete: () => void) {
    console.log('Starting merge animation with', allCards.length, 'cards');
    
    // Move all 4 cards to right side of screen (away from Grayson)
    const centerX = 240; // Right side
    const centerY = 90; // Middle height
    
    allCards.forEach((card, i) => {
      console.log(`Card ${card.id} at position (${card.sprite.x}, ${card.sprite.y})`);
      // Stagger the movement - cards fly in
      this.tweens.add({
        targets: [card.sprite, card.number],
        x: centerX,
        y: centerY,
        scale: { from: card.sprite.scaleX, to: 0 }, // Shrink to nothing
        duration: 600,
        delay: i * 80, // Quick stagger
        ease: 'Power2.easeIn'
      });
    });
    
    // After all cards merge, create full card
    this.time.delayedCall(1000, () => {
      // Destroy card pieces
      allCards.forEach(card => {
        card.sprite.destroy();
        card.number.destroy();
      });
      
      // Flash effect (like title scene)
      const flash = this.add.rectangle(160, 90, 320, 180, 0xffffff, 0.8);
      flash.setDepth(99);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 400,
        onComplete: () => flash.destroy()
      });
      
      // Create full anniversary card (smaller)
      const fullCard = this.add.graphics();
      fullCard.setPosition(centerX, centerY);
      fullCard.setDepth(100);
      fullCard.setAlpha(0);
      
      // Draw anniversary card (smaller than title scene)
      const cardWidth = 30;
      const cardHeight = 40;
      
      // Card body (golden/orange)
      fullCard.fillStyle(0xffaa00, 1.0);
      fullCard.fillRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight);
      
      // Card border
      fullCard.lineStyle(1.5, 0xffdd88, 1.0);
      fullCard.strokeRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight);
      
      // Small red heart in center
      fullCard.fillStyle(0xff0000, 1.0);
      const heartSize = 6;
      fullCard.beginPath();
      fullCard.arc(-heartSize/4, 0, heartSize/2, 0, Math.PI * 2);
      fullCard.arc(heartSize/4, 0, heartSize/2, 0, Math.PI * 2);
      fullCard.fillPath();
      fullCard.fillTriangle(-heartSize/2, heartSize/4, heartSize/2, heartSize/4, 0, heartSize);
      
      // Update counter to 4/4 when full card appears!
      this.cardPiecesCollected = 4;
      this.updateMemoryCounter();
      
      // Fade in and scale full card
      this.tweens.add({
        targets: fullCard,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 600,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Sparkles
          spawnCardPieceSparkles(this, centerX, centerY);
          
          // Move to Grayson's hand (player position)
          this.time.delayedCall(800, () => {
            this.tweens.add({
              targets: fullCard,
              x: this.player.x,
              y: this.player.y - 10, // Above head/in hand
              scaleX: 0.8,
              scaleY: 0.8,
              duration: 800,
              ease: 'Power2.easeInOut',
              onComplete: () => {
                // Fade out and callback
                this.tweens.add({
                  targets: fullCard,
                  alpha: 0,
                  duration: 600,
                  onComplete: () => {
                    fullCard.destroy();
                    onComplete();
                  }
                });
              }
            });
          });
        }
      });
    });
  }

  private startCardShuffleGame() {
    // Keep Grayson visible
    
    // Create 4 card piece sprites with numbers
    const topY = 50; // Top area for active cards
    const bottomY = 150; // Bottom area for solved cards
    const cardScale = 2.5; // Big cards!
    
    const allCards: any[] = [];
    
    // Create all 4 card pieces
    for (let i = 0; i < 4; i++) {
      const cardNum = i + 1;
      const x = 160; // Start centered
      
      // Card piece sprite
      const cardSprite = createCardPieceSprite(this, x, topY);
      cardSprite.setScale(cardScale);
      cardSprite.setDepth(50);
      cardSprite.setVisible(false); // Hidden initially
      
      // Make graphics interactive with smaller hit area
      const hitSize = 20 * cardScale; // Smaller hit area
      cardSprite.setInteractive(
        new Phaser.Geom.Rectangle(-hitSize/2, -hitSize/2, hitSize, hitSize),
        Phaser.Geom.Rectangle.Contains
      );
      cardSprite.input!.cursor = 'pointer'; // Hand cursor
      
      // Store ID on the sprite for debugging
      (cardSprite as any).cardId = cardNum;
      
      // Card number on top
      const cardNumber = this.add.text(x, topY, cardNum.toString(), {
        fontSize: '20px',
        color: '#000000',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      });
      cardNumber.setOrigin(0.5);
      cardNumber.setDepth(51);
      cardNumber.setVisible(false);
      
      allCards.push({
        id: cardNum,
        sprite: cardSprite,
        number: cardNumber,
        x: x,
        y: topY,
        solved: false
      });
    }
    
    // Show all cards with numbers first
    const spacing = 15;
    const totalWidth = (32 * cardScale + spacing) * 4 - spacing;
    const startX = (320 - totalWidth) / 2 + (32 * cardScale) / 2;
    
    allCards.forEach((card, i) => {
      const x = startX + i * (32 * cardScale + spacing);
      card.sprite.setPosition(x, topY);
      card.sprite.setVisible(true);
      card.number.setPosition(x, topY);
      card.number.setVisible(true);
    });
    
    // Show "Press ENTER to play" instruction
    const readyPrompt = this.add.text(160, 120, "Press ENTER to start", {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    });
    readyPrompt.setOrigin(0.5);
    readyPrompt.setDepth(100);
    
    // Wait for ENTER
    const generation = this.sceneGeneration; // Capture current generation
    const startGame = () => {
      if (generation !== this.sceneGeneration) {
        this.events.off('update', startGame); // Scene restarted, stop listening
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
        this.events.off('update', startGame);
        readyPrompt.destroy();
        
        // Hide all cards before starting phase 1
        allCards.forEach(card => {
          card.sprite.setVisible(false);
          card.number.setVisible(false);
        });
        
        // Start phase 1
        this.startCardPhase(allCards, 1, topY, bottomY, cardScale);
      }
    };
    this.events.on('update', startGame);
  }
  
  private startCardPhase(allCards: any[], targetNumber: number, topY: number, bottomY: number, cardScale: number) {
    // Get remaining unsolved cards
    const activeCards = allCards.filter(c => !c.solved);
    const numCards = activeCards.length;
    
    if (numCards === 0) {
      // All cards found! Merge animation
      this.mergeCardsAnimation(allCards, () => {
        // After merge, show dialogue
        this.dialogueManager.show("Grayson: Finally! I put the pieces together. I can get out of the void...");
        
        const generation = this.sceneGeneration; // Capture current generation
        const checkEnter = () => {
          if (generation !== this.sceneGeneration) {
            this.events.off('update', checkEnter); // Scene restarted, stop listening
            return;
          }
          if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
            this.events.off('update', checkEnter);
            this.dialogueManager.hide();
            this.show3DGridTransition();
          }
        };
        this.events.on('update', checkEnter);
      });
      return;
    }
    
    // Special case: if only 1 card left, auto-solve it
    if (numCards === 1) {
      const lastCard = activeCards[0];
      const instruction = this.add.text(160, 20, `Last card: #${lastCard.id}!`, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#000000',
        padding: { x: 6, y: 3 }
      });
      instruction.setOrigin(0.5);
      instruction.setDepth(60);
      
      lastCard.sprite.setPosition(160, topY);
      lastCard.sprite.setVisible(true);
      lastCard.number.setPosition(160, topY);
      lastCard.number.setVisible(true);
      lastCard.solved = true;
      
      // Calculate position in bottom pile
      const bottomSpacing = 15;
      const bottomTotalWidth = (32 * cardScale + bottomSpacing) * 4 - bottomSpacing;
      const bottomStartX = (320 - bottomTotalWidth) / 2 + (32 * cardScale) / 2;
      const bottomX = bottomStartX + (lastCard.id - 1) * (32 * cardScale + bottomSpacing);
      
      // Move to bottom after 1 second
      this.time.delayedCall(1000, () => {
        this.tweens.add({
          targets: [lastCard.sprite, lastCard.number],
          x: bottomX,
          y: bottomY,
          duration: 500,
          ease: 'Power2.easeOut',
          onComplete: () => {
            instruction.destroy();
            // All done! Trigger merge animation
            this.time.delayedCall(500, () => {
              this.mergeCardsAnimation(allCards, () => {
                // After merge, show dialogue
                this.dialogueManager.show("Grayson: Finally! I put the pieces together. I can get out of the void...");
                
                const generation = this.sceneGeneration; // Capture current generation
                const checkEnter = () => {
                  if (generation !== this.sceneGeneration) {
                    this.events.off('update', checkEnter); // Scene restarted, stop listening
                    return;
                  }
                  if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
                    this.events.off('update', checkEnter);
                    this.dialogueManager.hide();
                    this.show3DGridTransition();
                  }
                };
                this.events.on('update', checkEnter);
              });
            });
          }
        });
      });
      return;
    }
    
    // Show instruction
    const instruction = this.add.text(160, 20, `Follow card #${targetNumber}`, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#000000',
      padding: { x: 6, y: 3 }
    });
    instruction.setOrigin(0.5);
    instruction.setDepth(60);
    
    // Position cards in top area
    const spacing = 15;
    const totalWidth = (32 * cardScale + spacing) * numCards - spacing;
    const startX = (320 - totalWidth) / 2 + (32 * cardScale) / 2;
    
    activeCards.forEach((card, i) => {
      // Safety check: ensure sprite and number exist and are active
      if (!card.sprite || !card.sprite.active || !card.number || !card.number.active) {
        console.warn('Card sprite or number is invalid:', card.id);
        return;
      }
      
      const x = startX + i * (32 * cardScale + spacing);
      card.x = x;
      card.y = topY;
      
      card.sprite.setPosition(x, topY);
      card.sprite.setVisible(true);
      card.sprite.setScale(cardScale);
      
      // ALWAYS show numbers at start of new phase
      card.number.setPosition(x, topY);
      card.number.setVisible(true);
      card.number.setScale(1); // Reset scale
      
      // Disable interaction initially (will be enabled after shuffle)
      card.sprite.disableInteractive();
    });
    
    console.log('Phase', targetNumber, 'cards positioned and made interactive');
    
    // Show numbers for 2 seconds
    this.time.delayedCall(2000, () => {
      // Hide numbers (flip)
      activeCards.forEach(card => {
        // Safety check
        if (!card.sprite || !card.sprite.active || !card.number || !card.number.active) {
          return;
        }
        
        this.tweens.add({
          targets: card.sprite,
          scaleX: 0,
          duration: 200,
          onComplete: () => {
            if (card.number && card.number.active) {
              card.number.setVisible(false);
            }
            if (card.sprite && card.sprite.active) {
              this.tweens.add({
                targets: card.sprite,
                scaleX: cardScale,
                duration: 200
              });
            }
          }
        });
      });
      
      // Shuffle
      this.time.delayedCall(600, () => {
        this.shuffleCardsPhase(activeCards, cardScale, () => {
          // After shuffle, enable picking
          instruction.setText('Click the correct card!');
          this.enableCardPicking(activeCards, allCards, targetNumber, instruction, topY, bottomY, cardScale);
        });
      });
    });
  }
  
  private shuffleCardsPhase(cards: any[], _cardScale: number, onComplete: () => void) {
    // Shuffle positions (faster!)
    const numSwaps = 10;
    this.time.addEvent({
      delay: 250, // Faster (was 400)
      repeat: numSwaps - 1,
      callback: () => {
        // Swap two random cards
        const i1 = Math.floor(Math.random() * cards.length);
        const i2 = Math.floor(Math.random() * cards.length);
        
        if (i1 !== i2) {
          // Safety check: ensure both cards are valid
          const card1Valid = cards[i1] && cards[i1].sprite && cards[i1].sprite.active;
          const card2Valid = cards[i2] && cards[i2].sprite && cards[i2].sprite.active;
          
          if (!card1Valid || !card2Valid) {
            return; // Skip this swap if either card is invalid
          }
          
          const tempX = cards[i1].x;
          cards[i1].x = cards[i2].x;
          cards[i2].x = tempX;
          
          // Animate swap
          this.tweens.add({
            targets: [cards[i1].sprite, cards[i1].number],
            x: cards[i1].x,
            duration: 200,
            ease: 'Power2.easeInOut'
          });
          this.tweens.add({
            targets: [cards[i2].sprite, cards[i2].number],
            x: cards[i2].x,
            duration: 200,
            ease: 'Power2.easeInOut'
          });
        }
      }
    });
    
    // After shuffle, callback (adjusted for faster timing)
    this.time.delayedCall(numSwaps * 250 + 300, onComplete);
  }
  
  private enableCardPicking(activeCards: any[], allCards: any[], targetNumber: number, instruction: Phaser.GameObjects.Text, topY: number, bottomY: number, cardScale: number) {
    console.log('=== Enabling card picking for', activeCards.length, 'cards, target:', targetNumber, '===');
    console.log('Active card IDs:', activeCards.map(c => c.id));
    console.log('Card positions (sprite.x, sprite.y):');
    activeCards.forEach(card => {
      if (card.sprite && card.sprite.active) {
        console.log(`  Card #${card.id}: x=${card.sprite.x.toFixed(1)}, y=${card.sprite.y.toFixed(1)}`);
      }
    });
    
    // Enable input for active cards
    activeCards.forEach(card => {
      // Safety check
      if (!card.sprite || !card.sprite.active) {
        console.warn('Cannot enable picking for invalid card:', card.id);
        return;
      }
      
      card.sprite.removeAllListeners(); // Clear old listeners
      card.sprite.setInteractive({ useHandCursor: true }); // Re-enable interaction
      
      // Use a proper closure to capture the correct card
      const clickedCard = card; // Capture in closure
      card.sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        console.log('🖱️ CLICK at x:', pointer.x, 'y:', pointer.y);
        console.log('   Card clicked:', clickedCard.id, 'Expected:', targetNumber);
        console.log('   Card position:', clickedCard.sprite.x, clickedCard.sprite.y);
        // Disable all other cards
        activeCards.forEach(c => c.sprite.disableInteractive());
        
        // Flip to show if correct
        this.tweens.add({
          targets: clickedCard.sprite,
          scaleX: 0,
          duration: 200,
          onComplete: () => {
            clickedCard.number.setVisible(true);
            this.tweens.add({
              targets: clickedCard.sprite,
              scaleX: cardScale,
              duration: 200,
              onComplete: () => {
                // Check if correct
                if (clickedCard.id === targetNumber) {
                  // Correct! Move to bottom pile
                  instruction.setText('Correct!');
                  clickedCard.solved = true;
                  
                  // Calculate bottom position based on card ID (1=leftmost, 4=rightmost)
                  const bottomSpacing = 15;
                  const bottomTotalWidth = (32 * cardScale + bottomSpacing) * 4 - bottomSpacing;
                  const bottomStartX = (320 - bottomTotalWidth) / 2 + (32 * cardScale) / 2;
                  const bottomX = bottomStartX + (clickedCard.id - 1) * (32 * cardScale + bottomSpacing);
                  
                  this.tweens.add({
                    targets: [clickedCard.sprite, clickedCard.number],
                    x: bottomX,
                    y: bottomY,
                    duration: 500,
                    ease: 'Power2.easeOut',
                    onComplete: () => {
                      instruction.destroy();
                      
                      // Continue to next phase
                      this.time.delayedCall(500, () => {
                        this.startCardPhase(allCards, targetNumber + 1, topY, bottomY, cardScale);
                      });
                    }
                  });
                } else {
                  // Wrong! Restart from beginning (card 1)
                  instruction.setText('Wrong! Starting over...');
                  
                  this.time.delayedCall(2000, () => {
                    instruction.destroy();
                    
                    // Reset all cards to unsolved
                    allCards.forEach(card => {
                      card.solved = false;
                      card.number.setVisible(false);
                      card.sprite.setVisible(false);
                    });
                    
                    // Restart from card 1
                    this.startCardPhase(allCards, 1, topY, bottomY, cardScale);
                  });
                }
              }
            });
          }
        });
      });
    });
  }
  
  private hideImagePopup() {
    this.popupVisible = false;
    this.imagePopup.setVisible(false);
    if (this.photoOverlay) {
      this.photoOverlay.style.display = 'none';
    }
    if (this.hockeyOverlay) {
      this.hockeyOverlay.style.display = 'none';
    }
  }
  
  private showNextImage() {
    if (this.currentPopupImage === 1) {
      // Switch from hinge screenshot to hockey chat
      this.currentPopupImage = 2;
      if (this.photoOverlay) {
        this.photoOverlay.style.display = 'none';
      }
      if (this.hockeyOverlay) {
        this.hockeyOverlay.style.display = 'block';
      }
      
      // Change message to simple style (two lines)
      this.popupMessageText.setText("ENTER to go meet \nat Northgate Station!");
      this.popupMessageText.setStyle({
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#cfe8ff",
        fontStyle: "normal",
        align: "center",
      });
    }
  }
  
  private updateChaseSequence(dt: number) {
    if (!this.cat || !this.npc) return; // Only if they exist
    
    this.chaseTime += dt;
    
    const chaseSpeed = 150; // Faster than normal movement
    const baseY = 95; // Base Y position
    
    // Move cat from left to right with bobbing motion
    this.cat.x += chaseSpeed * dt;
    // Add vertical bobbing motion (sine wave)
    const catBob = Math.sin(this.chaseTime * 8) * 6; // Fast bouncing
    this.cat.y = baseY + catBob;
    
    // Dog runs away to the right (faster than cat initially) with different bobbing
    if (this.npc.x < 400) {
      this.npc.x += (chaseSpeed + 30) * dt;
      // Dog has slightly different bobbing motion
      const dogBob = Math.sin(this.chaseTime * 10) * 4; // Faster, smaller bouncing (scared!)
      this.npc.y = baseY + dogBob;
    }
    
    // Spawn "MEOW!" text randomly during chase
    if (Math.random() < 0.03 && this.cat.x > 0 && this.cat.x < 320) { // 3% chance per frame
      this.spawnMeowText(this.cat.x + 10, this.cat.y - 15);
    }
    
    // Once both are off-screen, end the chase
    if (this.cat.x > 400 && this.npc.x > 400) {
      this.chaseState = "idle";
      // Hide both sprites
      this.cat.setVisible(false);
      this.npc.setVisible(false);
      
      // Clean up any remaining meow texts
      this.meowTexts.forEach(text => text.destroy());
      this.meowTexts = [];
    }
  }
  
  private setupSmushPlayingScene() {
    // Smush is batting around the 2 existing card pieces (near her on the left)
    const piece1 = createCardPieceSprite(this, 45, 100);  // Not as far left
    const piece2 = createCardPieceSprite(this, 70, 110);  // More to the right
    piece1.setDepth(10);
    piece2.setDepth(10);
    
    piece1.setData('isMovingPiece', true);
    piece2.setData('isMovingPiece', true);
    piece1.setData('collected', false);
    piece2.setData('collected', false);
    
    // Store pieces
    this.cardPiece = piece1; // Reuse cardPiece for first one
    piece1.setData('piece2', piece2); // Link to second piece
    
    // Animate Smush batting at pieces (sprite swap animation)
    this.animateSmushPlaying();
    
    // Animate pieces bouncing around
    this.animateCardPiecesMoving(piece1, piece2);
    
    // Show initial dialogue (while Grayson is walking in)
    // Block ENTER during walk, then allow manual dismissal
    this.time.delayedCall(500, () => {
      this.isDialogueAutoOnly = true; // Block ENTER during walk
      this.dialogueManager.show("Grayson: CAT! I need those!");
      
      // After Grayson finishes walking, allow manual close (don't auto-dismiss)
      this.time.delayedCall(2000, () => {
        this.isDialogueAutoOnly = false; // Allow ENTER now
        // Dialogue stays until player presses ENTER
      });
    });
  }
  
  private animateSmushPlaying() {
    // Alternate between normal and extended paw sprites
    const drawNormal = this.cat.getData('drawNormal');
    const drawExtended = this.cat.getData('drawExtendedPaw');
    
    let pawExtended = false;
    
    // Swap sprites periodically (paw in/out)
    const pawTimer = this.time.addEvent({
      delay: 700, // Every 0.7 seconds
      loop: true,
      callback: () => {
        pawExtended = !pawExtended;
        if (pawExtended) {
          drawExtended();
        } else {
          drawNormal();
        }
      }
    });
    
    // Store timer so we can stop it later
    this.cat.setData('pawTimer', pawTimer);
  }
  
  private animateCardPiecesMoving(piece1: Phaser.GameObjects.Graphics, piece2: Phaser.GameObjects.Graphics) {
    // Pieces slide around near Smush's paw area (small movements)
    this.tweens.add({
      targets: piece1,
      x: 70,    // Small slide near Smush
      y: 102,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    
    this.tweens.add({
      targets: piece2,
      x: 50,    // Up-left but shifted right
      y: 95,    // DECREASE y = UP
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }
  
  private checkSmushPieceCollection() {
    // Check if player can collect the moving pieces
    if (!this.cardPiece || !this.cardPiece.getData('isMovingPiece')) return;
    
    const piece1 = this.cardPiece;
    const piece2 = piece1.getData('piece2');
    
    // Check piece 1
    if (!piece1.getData('collected')) {
      // Check proximity using utility
      if (checkProximity(this.player, piece1, 20) && 
          Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
        piece1.setData('collected', true);
        this.tweens.killTweensOf(piece1);
        
        // Move to safe spot (left side)
        this.tweens.add({
          targets: piece1,
          x: 40,
          y: 40,
          duration: 500,
          ease: "Power2"
        });
      }
    }
    
    // Check piece 2
    if (piece2 && !piece2.getData('collected')) {
      // Check proximity using utility
      if (checkProximity(this.player, piece2, 20) && 
          Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
        piece2.setData('collected', true);
        this.tweens.killTweensOf(piece2);
        
        // Move to safe spot (next to first piece)
        this.tweens.add({
          targets: piece2,
          x: 52,
          y: 40,
          duration: 500,
          ease: "Power2"
        });
      }
    }
    
    // Check if both collected
    if (piece1.getData('collected') && piece2 && piece2.getData('collected')) {
      // Both safe! Mark as complete to prevent re-triggering
      if (!piece1.getData('examinationStarted')) {
        piece1.setData('examinationStarted', true);
        
        // Smush knows she's in trouble - runs to the right side!
        this.tweens.killTweensOf(this.cat);
        
        // Stop paw animation
        const pawTimer = this.cat.getData('pawTimer');
        if (pawTimer) pawTimer.destroy();
        
        // Draw normal sprite (no extended paw)
        const drawNormal = this.cat.getData('drawNormal');
        if (drawNormal) drawNormal();
        
        this.cat.setScale(-1, 1); // Face right (running away)
        
        // Set looking down-left BEFORE moving
        this.cat.setData('lookingDown', false);
        this.cat.setData('lookingDownLeft', true);
        
        // Redraw with new pupils
        const redrawNormal = this.cat.getData('drawNormal');
        if (redrawNormal) redrawNormal();
        
        this.tweens.add({
          targets: this.cat,
          x: 240, // Right side (original position)
          duration: 1200,
          ease: "Power2"
        });
        
        // Now examine the ice hockey memory (wait for Smush to finish running)
        this.time.delayedCall(1300, () => {
          this.examineIceHockeyMemory();
        });
      }
    }
  }
  
  private showMemoryProjection(x: number, y: number) {
    // Create solid projection beam from card downward (UFO-style)
    const beam = this.add.graphics();
    beam.setDepth(19);
    
    // Outer glow (wider cone - extends below strawberry but not to dialogue)
    beam.fillStyle(0xff8888, 0.15);
    beam.beginPath();
    beam.moveTo(x - 5, y); // Top left (from card)
    beam.lineTo(x + 5, y); // Top right (from card)
    beam.lineTo(x + 30, y + 60); // Bottom right (shorter)
    beam.lineTo(x - 30, y + 60); // Bottom left (shorter)
    beam.closePath();
    beam.fill();
    
    // Main beam (solid filled triangle)
    beam.fillStyle(0xffcccc, 0.35); // Soft red glow
    beam.beginPath();
    beam.moveTo(x - 4, y); // Top from card
    beam.lineTo(x + 4, y);
    beam.lineTo(x + 25, y + 55); // Bottom right (shorter)
    beam.lineTo(x - 25, y + 55); // Bottom left (shorter)
    beam.closePath();
    beam.fill();
    
    // Strawberry icon appears BELOW the card (in the beam)
    const strawberry = this.add.graphics();
    strawberry.setPosition(x, y + 45);
    
    // Red strawberry body (wider at top, tapered to point at bottom, taller)
    strawberry.fillStyle(0xff4444, 1);
    // Draw as polygon for strawberry shape
    strawberry.beginPath();
    strawberry.moveTo(-10, -7); // Top left (wider opening)
    strawberry.lineTo(10, -7);  // Top right (wider opening)
    strawberry.lineTo(2, 8);    // Bottom right (narrow point)
    strawberry.lineTo(-2, 8);   // Bottom left (narrow point)
    strawberry.closePath();
    strawberry.fill();
    
    // Round top slightly (narrower curve)
    strawberry.fillCircle(-7, -5, 2.5);
    strawberry.fillCircle(7, -5, 2.5);
    
    // Green leafy top
    strawberry.fillStyle(0x4caf50, 1);
    strawberry.fillRect(-6, -9, 12, 3);
    
    // Yellow seeds
    strawberry.fillStyle(0xffeb3b, 1);
    strawberry.fillCircle(-3, -2, 1);
    strawberry.fillCircle(3, 0, 1);
    strawberry.fillCircle(0, 3, 1);
    
    strawberry.setDepth(30);
    strawberry.setAlpha(0);
    beam.setAlpha(0);
    
    // Fade in projection beam and strawberry together
    this.tweens.add({
      targets: strawberry,
      alpha: 1,
      duration: 600,
      ease: "Power2"
    });
    
    this.tweens.add({
      targets: beam,
      alpha: 1,
      duration: 600,
      ease: "Power2"
    });
    
    // Gentle pulse animation (stays visible - doesn't leave)
    this.tweens.add({
      targets: strawberry,
      scale: 1.05, // Smaller pulse so it doesn't look too pointy
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }
  
  private examineIceHockeyMemory() {
    // Stop Smush animation (but don't kill her run tween - it's already done)
    // this.tweens.killTweensOf(this.cat); // Removed - was killing her movement
    
    // Grayson pulls the ice hockey memory from his pocket
    const iceHockeyMemory = createCardPieceSprite(this, this.player.x, this.player.y - 10);
    iceHockeyMemory.setDepth(15);
    
    // Update counter immediately as card appears
    this.cardPiecesCollected = 3; // Set to 3
    this.updateMemoryCounter();
    
    // Animate it floating up to center for examination
    this.tweens.add({
      targets: iceHockeyMemory,
      x: 160,
      y: 70,
      duration: 800,
      ease: "Power2",
      onComplete: () => {
        // Sparkles after it arrives
        spawnCardPieceSparkles(this, 160, 70);
        
        // Memory projection appears from card bottom (strawberry icon)
        this.time.delayedCall(800, () => {
          this.showMemoryProjection(160, 74); // Start from card's bottom edge
          
          // Combined dialogue when projection appears
          this.time.delayedCall(600, () => {
            this.isDialogueAutoOnly = true; // Auto-dismiss, no ENTER
            this.dialogueManager.show("Grayson: And the memory I just got...\nIt's from the farmers market!");
            
            // Auto-dismiss after reading time
            this.time.delayedCall(3000, () => {
              if (this.dialogueManager.isVisible()) {
                this.dialogueManager.hide();
                this.isDialogueAutoOnly = false;
              }
              // Trigger meows after dialogue closes
              this.time.delayedCall(300, () => {
                this.triggerSmushMeowsAndFinalDialogue();
              });
            });
          });
        });
      }
    });
    
    // Counter already at 3 from Seattle Traffic - don't increment again!
  }
  
  private triggerSmushMeowsAndFinalDialogue() {
    // Smush meows 3 times
    this.spawnMeowText(this.cat.x, this.cat.y - 15);
    this.time.delayedCall(400, () => {
      this.spawnMeowText(this.cat.x, this.cat.y - 15);
    });
    this.time.delayedCall(800, () => {
      this.spawnMeowText(this.cat.x, this.cat.y - 15);
    });
    
    // After meows, Grayson responds
    this.time.delayedCall(1500, () => {
      this.dialogueManager.show("Grayson: I'll get some pie and you'll get some goodies.");
      
        // Transition to farmers market level
        this.time.delayedCall(4000, () => {
          this.dialogueManager.hide();
          fadeToScene(this, SCENES.FARMERS_MARKET, 1000);
        });
    });
  }

  private show3DGridTransition() {
    // Create grid overlay (matching Void3D magenta grid)
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0xff00ff, 0); // Magenta, start invisible
    gridGraphics.setDepth(1000); // Above everything
    
    // Draw the grid (16px cells, matching original void)
    const gridSize = 16;
    const screenWidth = 320;
    const screenHeight = 180;
    for (let x = 0; x <= screenWidth; x += gridSize) {
      gridGraphics.lineBetween(x, 0, x, screenHeight);
    }
    for (let y = 0; y <= screenHeight; y += gridSize) {
      gridGraphics.lineBetween(0, y, screenWidth, y);
    }
    
    // Fade in the 3D grid (faster)
    this.tweens.add({
      targets: gridGraphics,
      alpha: 1,
      duration: 1000,
      ease: "Power2"
    });
    
    // Launch Void3D as overlay immediately after grid starts
    this.time.delayedCall(100, () => { // Start while grid is still fading in
      this.scene.launch(SCENES.VOID_3D);
      this.scene.bringToTop(SCENES.VOID_3D);
    });
  }
  
  shutdown() {
    // Clean up HTML overlays when scene stops
    if (this.photoOverlay && this.photoOverlay.parentElement) {
      this.photoOverlay.remove();
      this.photoOverlay = undefined;
    }
    if (this.hockeyOverlay && this.hockeyOverlay.parentElement) {
      this.hockeyOverlay.remove();
      this.hockeyOverlay = undefined;
    }
    
    // Clean up arrays
    this.cardSparkles = [];
    this.meowTexts = [];
    this.crowdPeople = [];
    this.stadiumElements = [];
  }
}
