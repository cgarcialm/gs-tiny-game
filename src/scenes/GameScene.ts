import Phaser from "phaser";
import { createGraysonSprite, updateGraysonWalk, createEboshiSprite, createSmushSprite, createCardPieceSprite, spawnCardPieceSparkles } from "../utils/sprites";

type DialogueState = "idle" | "open";
type ChaseState = "idle" | "chasing";

export default class GameScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private player!: Phaser.GameObjects.Container;
  private npc!: Phaser.GameObjects.Container;
  private cat!: Phaser.GameObjects.Container;
  private cardPiece!: Phaser.GameObjects.Graphics;
  private cardSparkles: Phaser.GameObjects.Text[] = [];

  private speed = 80; // px/s
  private promptText!: Phaser.GameObjects.Text;
  private cardCounterText!: Phaser.GameObjects.Text;

  // dialogue UI
  private dialogState: DialogueState = "idle";
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogLines: string[] = [
    "Grayson! You look... different. More defined!",
    "Oh right, peanut butter? No? Well, there's a card piece over there...",
    "*suddenly looks worried* Oh no... I hear something... RUN!!"
  ];
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
    // Set camera to respect pixel art settings
    this.cameras.main.setRoundPixels(true);

    // Pixel grid background (procedural)
    // More intense blue background with bright green thin grid lines
    this.createCustomGrid();

    // Player (Grayson) - pixel art character
    this.player = createGraysonSprite(this, 160, 90);

    // NPC - Eboshi (greyhound dog)
    this.npc = createEboshiSprite(this, 220, 95);
    this.npc.setScale(1, 1); // Face left initially (default orientation)

    // NPC - Smush (brown cat) - hidden initially, will appear from left
    this.cat = createSmushSprite(this, -50, 95);
    this.cat.setVisible(false);

    // Card piece on the floor - hidden initially
    this.cardPiece = createCardPieceSprite(this, 120, 130);
    this.cardPiece.setVisible(false);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
      E: this.input.keyboard!.addKey("E"),
      SPACE: this.input.keyboard!.addKey("SPACE"),
      ENTER: this.input.keyboard!.addKey("ENTER"),
      ESC: this.input.keyboard!.addKey("ESC"),
    };

    // "Press E to interact" prompt (hidden by default)
    this.promptText = this.add
      .text(0, 0, "E to interact", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#cfe8ff",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Card piece counter at top right of screen
    this.cardCounterText = this.add
      .text(310, 8, `Memories: ${this.cardPiecesCollected}/${this.totalCardPieces}`, {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ffeb3b",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
        resolution: 1,
      })
      .setOrigin(1, 0)
      .setDepth(10);

    // Dialogue UI (hidden)
    this.createDialogUI();
    this.hideDialog();
    
    // Create image popup (hidden initially)
    this.createImagePopup();
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

  private createDialogUI() {
    this.dialogBox = this.add
      .rectangle(160, 160, 300, 40, 0x000000, 0.6)
      .setStrokeStyle(1, 0x99bbff, 0.9)
      .setOrigin(0.5);

    this.dialogText = this.add
      .text(20, 146, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#dff1ff",
        wordWrap: { width: 280 },
        resolution: 2,
      })
      .setOrigin(0, 0);
  }

  private showDialog(line: string) {
    this.dialogState = "open";
    this.dialogBox.setVisible(true);
    this.dialogText.setText(line).setVisible(true);
  }

  private hideDialog() {
    this.dialogState = "idle";
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
  }

  private advanceDialog() {
    this.dialogIndex++;
    
    // Show card piece when Eboshi mentions it (dialogue line 1)
    if (this.dialogIndex === 1) {
      this.cardPiece.setVisible(true);
      const sparkles = spawnCardPieceSparkles(this, 120, 130);
      this.cardSparkles.push(...sparkles);
    }
    
    if (this.dialogIndex >= this.dialogLines.length) {
      this.dialogIndex = 0;
      this.hideDialog();
      
      // Trigger cat chase after dialogue ends
      if (!this.catHasAppeared) {
        this.startCatChase();
      }
    } else {
      this.showDialog(this.dialogLines[this.dialogIndex]);
    }
  }
  
  private startCatChase() {
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

    // Handle image popup
    if (this.popupVisible) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
        if (this.currentPopupImage === 1) {
          this.showNextImage();
        } else {
          // After second image, go to Northgate Station
          this.hideImagePopup();
          this.scene.start("Northgate");
        }
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
        this.hideImagePopup();
      }
      return;
    }

    // Handle chase sequence
    if (this.chaseState === "chasing") {
      this.updateChaseSequence(dt);
      return;
    }

    // If in dialogue, only allow closing/advancing; no movement
    if (this.dialogState === "open") {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.hideDialog();
      if (
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
        Phaser.Input.Keyboard.JustDown(this.keys.ENTER)
      ) {
        this.advanceDialog();
      }
      return;
    }

    // Movement (keyboard only)
    let vx = 0,
      vy = 0;
    if (this.cursors.left?.isDown || this.keys.A.isDown) vx -= 1;
    if (this.cursors.right?.isDown || this.keys.D.isDown) vx += 1;
    if (this.cursors.up?.isDown || this.keys.W.isDown) vy -= 1;
    if (this.cursors.down?.isDown || this.keys.S.isDown) vy += 1;

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
    
    // Round player position to prevent sub-pixel transparency issues
    this.player.x = Math.round(this.player.x);
    this.player.y = Math.round(this.player.y);

    // Keep inside 320x180 play area (tiny padding)
    this.player.x = Phaser.Math.Clamp(this.player.x, 6, 320 - 6);
    this.player.y = Phaser.Math.Clamp(this.player.y, 6, 180 - 6);
    
    // Update walking animation
    updateGraysonWalk(this.player, isMoving);

    // Proximity check to NPC (only if dog is still visible)
    if (this.npc.visible) {
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
        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
          this.hasInteractedWithEboshi = true;
          this.dialogIndex = 0;
          this.showDialog(this.dialogLines[this.dialogIndex]);
          this.promptText.setVisible(false); // Hide prompt once player interacts
        }
      } else if (!near || this.hasInteractedWithEboshi) {
        this.promptText.setVisible(false);
      }
      
      // Still allow interaction even if prompt is hidden
      if (near && this.hasInteractedWithEboshi) {
        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
          this.dialogIndex = 0;
          this.showDialog(this.dialogLines[this.dialogIndex]);
        }
      }
    } else {
      this.promptText.setVisible(false);
    }
    
    // Proximity check to card piece (if visible and not collected)
    if (this.cardPiece.visible && !this.cardPieceCollected) {
      const cardDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.cardPieceX,
        this.cardPieceY
      );
      
      const nearCard = cardDistance < 30; // distance threshold for card
      
      // Allow picking up card when near (no prompt - player already knows to press E)
      if (nearCard && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.pickUpCardPiece();
      }
    }
  }
  
  private pickUpCardPiece() {
    this.cardPieceCollected = true;
    this.cardPiece.setVisible(false);
    this.promptText.setVisible(false);
    
    // Update counter
    this.cardPiecesCollected++;
    this.cardCounterText.setText(`Memories: ${this.cardPiecesCollected}/${this.totalCardPieces}`);
    
    // Spawn celebration sparkles
    const sparkles = spawnCardPieceSparkles(this, this.cardPieceX, this.cardPieceY);
    
    // Show pickup message
    const pickupText = this.add.text(this.cardPieceX, this.cardPieceY - 20, "Memory collected!", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ffeb3b",
      fontStyle: "bold",
      resolution: 2,
    }).setOrigin(0.5);
    
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
}
