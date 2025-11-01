import Phaser from "phaser";
import { createGraysonSprite, updateGraysonWalk, createEboshiSprite, createSmushSprite, createCeciSprite, createCardPieceSprite, spawnCardPieceSparkles } from "../utils/sprites";
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
import { PROMPT_TEXT_STYLE, HELP_HINT_TEXT_STYLE, COUNTER_TEXT_STYLE, FLOATING_MESSAGE_STYLE } from "../config/textStyles";

type DialogueState = "idle" | "open";
type ChaseState = "idle" | "chasing";

export default class GameScene extends Phaser.Scene {
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
  
  // Card piece tracking
  private cardPieceCollected = false;
  private cardPieceX = 120;
  private cardPieceY = 130;
  private cardPiecesCollected = 0;
  private totalCardPieces = 3;
  
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
    // Initialize common scene elements (camera, controls, menus, dialogue, cheat console)
    const setup = initializeGameScene(this);
    this.controls = setup.controls;
    this.helpMenu = setup.helpMenu;
    this.pauseMenu = setup.pauseMenu;
    // @ts-ignore - CheatConsole used for side effects (global keyboard listener)
    this._cheatConsole = setup.cheatConsole;
    this.dialogueManager = setup.dialogueManager;

    // Pixel grid background (procedural)
    // More intense blue background with bright green thin grid lines
    this.createCustomGrid();
    
    // Get completed levels (use DEBUG_START_LEVEL for testing)
    this.completedLevels = DEBUG_START_LEVEL || this.registry.get('completedLevels') || 0;

    // Setup scene based on completed levels
    this.setupSceneForLevel(this.completedLevels);

    // "Press E to interact" prompt (hidden by default)
    this.promptText = this.add
      .text(0, 0, "E to interact", PROMPT_TEXT_STYLE)
      .setOrigin(0.5)
      .setVisible(false);

    // Card piece counter at top right of screen
    // Set initial count based on completed levels
    this.cardPiecesCollected = this.completedLevels;
    
    this.cardCounterText = this.add
      .text(310, 8, `Memories: ${this.cardPiecesCollected}/${this.totalCardPieces}`, COUNTER_TEXT_STYLE)
      .setOrigin(1, 0)
      .setDepth(10);
    
    // Help hint (bottom-right corner) - shown after first Eboshi interaction in level 0
    this.helpHintText = this.add
      .text(HELP_HINT_X, HELP_HINT_Y, "H for Help", HELP_HINT_TEXT_STYLE)
      .setOrigin(1, 1)
      .setDepth(10);
    
    // Only show after Eboshi interaction (level 0), or if already unlocked
    const showHelpHint = this.registry.get('showHelpHint') || false;
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
        // Level 2: After Ice Hockey - Smush playing with memories!
        // Grayson starts off-screen right
        this.player = createGraysonSprite(this, 340, 90);
        this.player.setScale(1, 1); // Face left (positive scale = left for Grayson)
        
        // Smush on left side, vertically centered, looking down at card pieces
        this.cat = createSmushSprite(this, 80, 90);
        this.cat.setData('lookingDown', true);
        this.cat.setData('playingWithPieces', true);
        
        // Redraw sprite with looking down pupils
        const redraw = this.cat.getData('redraw');
        if (redraw) redraw();
        
        // Two card pieces sliding around (Smush batting them)
        this.setupSmushPlayingScene();
        
        // Grayson walks in from right to center
        this.time.delayedCall(500, () => {
          // Animate walking
          const walkTimer = this.time.addEvent({
            delay: 150,
            repeat: 12, // ~2 seconds of walking
            callback: () => {
              updateGraysonWalk(this.player, true);
            }
          });
          
          this.tweens.add({
            targets: this.player,
            x: 160, // Stop at center
            duration: 2000,
            ease: "Linear",
            onComplete: () => {
              walkTimer.destroy();
              // Arrived - dialogue triggers from setupSmushPlayingScene at 3s mark
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
    if (this.completedLevels === 0 && this.hasInteractedWithEboshi) {
      this.registry.set('showHelpHint', true);
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
    const meowText = this.add
      .text(x, y, "MEOW!", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffeb3b",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);
    
    this.meowTexts.push(meowText);
    
    // Animate text floating up and fading out
    this.tweens.add({
      targets: meowText,
      y: y - 30,
      alpha: 0,
      duration: 1000,
      ease: "Power2",
      onComplete: () => {
        meowText.destroy();
        const index = this.meowTexts.indexOf(meowText);
        if (index > -1) {
          this.meowTexts.splice(index, 1);
        }
      }
    });
  }

  update() {
    const dt = this.game.loop.delta / 1000;

    // Handle menu input (ESC for pause, H for help)
    if (handleMenuInput(this, this.controls, this.helpMenu, this.pauseMenu, undefined, this._cheatConsole)) {
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
          this.scene.start("Northgate");
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
        } else {
          this.dialogueManager.hide();
        }
      }
      return;
    }
    
    // Level 2: Check for collecting moving pieces from Smush
    if (this.completedLevels === 2 && this.cardPiece && this.cardPiece.getData('isMovingPiece')) {
      this.checkSmushPieceCollection();
    }

    // Movement (WASD + arrow keys)
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

    // Level 0: Proximity check to NPC (Eboshi) - only on level 0
    if (this.completedLevels === 0 && this.npc && this.npc.visible) {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.npc.x,
        this.npc.y
      );

      const near = d < 50; // distance threshold to show prompt
      
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
      const cardDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.cardPieceX,
        this.cardPieceY
      );
      
      const nearCard = cardDistance < 30; // distance threshold for card
      
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
    img.style.maxWidth = '550px';
    img.style.maxHeight = '550px';
    img.style.border = '3px solid #ff66ff';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 0 20px rgba(255, 102, 255, 0.5)';
    img.style.imageRendering = 'auto';
    img.style.display = 'block';
    img.style.marginLeft = '500px'; // Even more offset to the right
    
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
    img.style.maxWidth = '550px';
    img.style.maxHeight = '550px';
    img.style.border = '3px solid #ff66ff';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 0 20px rgba(255, 102, 255, 0.5)';
    img.style.imageRendering = 'auto';
    img.style.display = 'block';
    img.style.marginLeft = '650px'; // Same offset as first image
    
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
    
    // Check for E press in update
    const checkPickup = () => {
      if (hasCollected) return; // Already collected
      
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        cardX,
        cardY
      );
      
      if (distance < 30 && Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
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
              fadeToScene(this, "IceHockey", 800);
            });
          }
        });
      });
    });
  }
  
  private updateMemoryCounter() {
    // Update text
    this.cardCounterText.setText(`Memories: ${this.cardPiecesCollected}/${this.totalCardPieces}`);
    
    // Pulse animation - scale up and down (longer, more dramatic)
    this.tweens.add({
      targets: this.cardCounterText,
      scale: 1.5,
      duration: 400,
      yoyo: true,
      repeat: 0,
      ease: "Back.easeOut"
    });
    
    // Color flash - yellow to white and back (longer)
    this.cardCounterText.setColor("#ffffff");
    this.time.delayedCall(400, () => {
      this.cardCounterText.setColor("#ffeb3b");
    });
    
    // Glow effect (longer duration, bigger scale)
    const glow = this.add.text(310, 8, `Memories: ${this.cardPiecesCollected}/${this.totalCardPieces}`, {
      ...COUNTER_TEXT_STYLE,
      fontStyle: "bold",
    }).setOrigin(1, 0).setDepth(9);
    
    this.tweens.add({
      targets: glow,
      scale: 2,
      alpha: 0,
      duration: 1500,
      ease: "Power2",
      onComplete: () => glow.destroy()
    });
    
    // Add sparkle particles around counter
    for (let i = 0; i < 3; i++) {
      const sparkle = this.add.text(310 + (Math.random() - 0.5) * 20, 8 + (Math.random() - 0.5) * 10, "✨", {
        fontSize: "12px",
        resolution: 1,
      }).setOrigin(0.5).setDepth(11);
      
      this.tweens.add({
        targets: sparkle,
        y: sparkle.y - 20,
        alpha: 0,
        duration: 1000,
        delay: i * 200,
        ease: "Power2",
        onComplete: () => sparkle.destroy()
      });
    }
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
    
    // Show initial dialogue (after Grayson walks in)
    this.time.delayedCall(3000, () => {
      this.dialogueManager.show("Grayson: CAT! I need those to rebuild the anniversary card!");
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
      const dist1 = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        piece1.x, piece1.y
      );
      
      if (dist1 < 20 && Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
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
      const dist2 = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        piece2.x, piece2.y
      );
      
      if (dist2 < 20 && Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
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
  
  private examineIceHockeyMemory() {
    // Stop Smush animation
    this.tweens.killTweensOf(this.cat);
    
    // Grayson pulls the ice hockey memory from his pocket
    const iceHockeyMemory = createCardPieceSprite(this, this.player.x, this.player.y - 10);
    iceHockeyMemory.setDepth(15);
    
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
      }
    });
    
    // Counter already at 3 from ice hockey - don't increment again!
    
    // Show examination dialogue
    this.time.delayedCall(1000, () => {
      this.dialogueManager.show("Grayson: Ant the oce from the game...\nIt's from the farmers market!");
      
      // After first dialogue
      this.time.delayedCall(4000, () => {
        // Smush reacts with meows
        this.time.delayedCall(2000, () => {
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
              fadeToScene(this, "Game", 1000); // Will be farmers market scene later
              // TODO: Create FarmersMarketScene and transition there
            });
          });
        });
      });
    });
  }
}
