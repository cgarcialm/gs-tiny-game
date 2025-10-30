import Phaser from "phaser";

const PLAYER_ASCII = String.raw`
   _---
   (o_o)
    /|\
    / \
`;

const CECI_ASCII = String.raw`
  ___
  |(o_o)|
  | /|\ |
   / \
`;

const SMUSH_ASCII = String.raw`
   /\_/\
   ( o.o )
   > ^ <
`;

const EBO_ASCII = String.raw`
  ^..^      /
  /_/\_____/
    /\   /\
    /  \ /  \
`;

// Screen dimensions
const SCREEN_WIDTH = 320;
const SCREEN_HEIGHT = 180;
const SCREEN_CENTER_X = SCREEN_WIDTH / 2;
const SCREEN_CENTER_Y = SCREEN_HEIGHT / 2;

// Positions
const TITLE_Y = 18;
const PLAYER_START_X = 300;
const PLAYER_START_Y = 100;
const CECI_X = 80;
const CECI_Y = 100;
const CARD_X = 115;
const CARD_Y = 105;
const CARD_HEART_Y = CARD_Y - 2;
const SMUSH_Y = 60; // Above player
const EBO_Y = 60;   // Above Ceci
const HINT_TEXT_Y = 164;

// Sizes
const CARD_WIDTH = 20;
const CARD_HEIGHT = 12;
const PIECE_SIZE = 4;
const NUM_PIECES = 15;
const CHAR_FONT_SIZE = 7;
const TITLE_FONT_SIZE = 12;
const HEART_FONT_SIZE = 8;
const DIALOG_FONT_SIZE = 10;
const HINT_FONT_SIZE = 9;
const LINE_SPACING = 1;
const CHAR_RESOLUTION = 2;
const TEXT_RESOLUTION = 1;

// Colors
const BG_COLOR = "#0b0f14";
const TITLE_COLOR = "#cfe8ff";
const PLAYER_COLOR = "#a7c7ff";
const CECI_COLOR = "#ff66ff";
const SMUSH_COLOR = "#66ff66";
const EBO_COLOR = "#ffcc99";
const CARD_COLOR = 0xffaa00;
const CARD_STROKE = 0xffdd88;
const DIALOG_COLOR = "#dff1ff";
const DIALOG_BG_ALPHA = 0.8;
const DIALOG_STROKE = 0x99bbff;
const HEART_COLOR = "#ff0000";

// Speeds
const PLAYER_SPEED = 100;
const EBO_SPEED = 120;
const SMUSH_SPEED = 140;
const CECI_SPEED = 110;
const PIECE_SPEED = 80;

// Distances
const APPROACH_DISTANCE = 50;

// Timings
const CUTSCENE_DURATION = 2000;
const CHASE_DELAY = 1000;

// Dialog
const DIALOG_WIDTH = 300;
const DIALOG_HEIGHT = 40;
const DIALOG_X = 20;
const DIALOG_Y = 146;
const DIALOG_WORDWRAP = 280;

type SceneState = 
  | "approaching"  // Player approaching Ceci
  | "card_ready"   // Ceci showing card, waiting for ENTER
  | "cutscene"     // Smush scares Ebo, card breaks
  | "chase"        // Ebo/Smush/pieces flying around
  | "sad_dialogue" // Ceci is sad
  | "ceci_runs"    // Ceci runs after fragments
  | "fragments_scattered" // Fragments went to void
  | "transformation_start" // Grayson realizes something's wrong
  | "transforming" // Grayson transforming to pixels
  | "void_entry"   // Entering the void text
  | "intro_complete"; // Ready to start game

export default class TitleScene extends Phaser.Scene {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private grayson!: Phaser.GameObjects.Text;
  private ceci!: Phaser.GameObjects.Text;
  private smush!: Phaser.GameObjects.Text;
  private ebo!: Phaser.GameObjects.Text;
  private card!: Phaser.GameObjects.Rectangle;
  private sceneState: SceneState = "approaching";
  
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private cardPieces: Phaser.GameObjects.Ellipse[] = [];
  
  // Transformation effects
  private pixelGrayson?: Phaser.GameObjects.Container;
  private transformationTime = 0;
  private glitchGraphics?: Phaser.GameObjects.Graphics;
  private voidText?: Phaser.GameObjects.Text;

  constructor() { 
    super({ key: "Title" });
  }

  create() {
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor(BG_COLOR);

    // Title
    this.add.text(SCREEN_CENTER_X, TITLE_Y, "gs-tiny-game", {
      fontFamily: "monospace",
      fontSize: `${TITLE_FONT_SIZE}px`,
      color: TITLE_COLOR,
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0.5);

    // Characters
    this.grayson = this.add.text(PLAYER_START_X, PLAYER_START_Y, PLAYER_ASCII, {
      fontFamily: "monospace",
      fontSize: `${CHAR_FONT_SIZE}px`,
      lineSpacing: LINE_SPACING,
      color: PLAYER_COLOR,
      align: "center",
      resolution: CHAR_RESOLUTION,
    }).setOrigin(0.5);

    this.ceci = this.add.text(CECI_X, CECI_Y, CECI_ASCII, {
      fontFamily: "monospace",
      fontSize: `${CHAR_FONT_SIZE}px`,
      lineSpacing: LINE_SPACING,
      color: CECI_COLOR,
      align: "center",
      resolution: CHAR_RESOLUTION,
    }).setOrigin(0.5);

    // Card (pixel anniversary card)
    this.card = this.add.rectangle(CARD_X, CARD_Y, CARD_WIDTH, CARD_HEIGHT, CARD_COLOR)
      .setStrokeStyle(1, CARD_STROKE);
    this.add.text(CARD_X, CARD_HEART_Y, "♥", {
      fontFamily: "monospace",
      fontSize: `${HEART_FONT_SIZE}px`,
      color: HEART_COLOR,
      resolution: CHAR_RESOLUTION,
    }).setOrigin(0.5);

    // Ebo above Ceci
    this.ebo = this.add.text(CECI_X, EBO_Y, EBO_ASCII, {
      fontFamily: "monospace",
      fontSize: `${CHAR_FONT_SIZE}px`,
      lineSpacing: LINE_SPACING,
      color: EBO_COLOR,
      align: "center",
      resolution: CHAR_RESOLUTION,
    }).setOrigin(0.5);

    // Smush above Grayson
    this.smush = this.add.text(PLAYER_START_X, SMUSH_Y, SMUSH_ASCII, {
      fontFamily: "monospace",
      fontSize: `${CHAR_FONT_SIZE - 1}px`,
      lineSpacing: LINE_SPACING,
      color: SMUSH_COLOR,
      align: "center",
      resolution: CHAR_RESOLUTION,
    }).setOrigin(0.5);

    this.hintText = this.add.text(SCREEN_CENTER_X, HINT_TEXT_Y, "A/D to move", {
      fontFamily: "monospace",
      fontSize: `${HINT_FONT_SIZE}px`,
      color: TITLE_COLOR,
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0.5);

    // Dialogue UI
    this.dialogBox = this.add
      .rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y + 70, DIALOG_WIDTH, DIALOG_HEIGHT, 0x000000, DIALOG_BG_ALPHA)
      .setStrokeStyle(1, DIALOG_STROKE, 0.9)
      .setOrigin(0.5)
      .setDepth(1);

    this.dialogText = this.add
      .text(DIALOG_X, DIALOG_Y, "", {
        fontFamily: "monospace",
        fontSize: `${DIALOG_FONT_SIZE}px`,
        color: DIALOG_COLOR,
        wordWrap: { width: DIALOG_WORDWRAP },
        resolution: CHAR_RESOLUTION,
      })
      .setOrigin(0, 0)
      .setDepth(2);

    this.hideDialog();

    // Input
    this.keys = {
      A: this.input.keyboard!.addKey("A"),
      D: this.input.keyboard!.addKey("D"),
      ENTER: this.input.keyboard!.addKey("ENTER"),
    };
  }

  update() {
    const dt = this.game.loop.delta / 1000;

    switch (this.sceneState) {
      case "approaching":
        this.handleMovement(dt);
        this.checkApproachCeci();
        break;
      
      case "card_ready":
        // Waiting for ENTER to look at card
        if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
          this.startCutscene();
        }
        break;
      
      case "cutscene":
        this.animateCutscene(dt);
        break;
      
      case "chase":
        this.animateChase(dt);
        break;
      
      case "sad_dialogue":
        if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
          this.ceciRuns();
        }
        break;
      
      case "ceci_runs":
        this.animateCeciRuns(dt);
        break;
      
      case "fragments_scattered":
        // Waiting for continuation
        break;
      
      case "transformation_start":
        // Waiting for transformation to begin
        break;
      
      case "transforming":
        this.animateTransformation(dt);
        break;
      
      case "void_entry":
        // Waiting before scene transition
        break;
      
      case "intro_complete":
        // Auto-transition to game
        break;
    }
  }

  private handleMovement(dt: number) {
    let vx = 0;
    if (this.keys.A.isDown) vx -= 1;
    if (this.keys.D.isDown) vx += 1;

    if (vx) {
      this.grayson.x += vx * PLAYER_SPEED * dt;
      this.grayson.x = Phaser.Math.Clamp(this.grayson.x, 30, SCREEN_WIDTH - 10);
      // Smush follows Grayson horizontally
      this.smush.x = this.grayson.x;
    }
  }

  private checkApproachCeci() {
    const distance = Phaser.Math.Distance.Between(
      this.grayson.x,
      this.grayson.y,
      this.ceci.x,
      this.ceci.y
    );

    if (distance < APPROACH_DISTANCE) {
      this.showDialog("Ceci: I made you an anniversary card! Press ENTER to look at it.");
      this.sceneState = "card_ready";
    }
  }

  private startCutscene() {
    this.hideDialog();
    this.sceneState = "cutscene";
    
    // Smush and Ebo are already visible, just animate their positions
    // Create card pieces scattered around
    for (let i = 0; i < NUM_PIECES; i++) {
      const angle = (Math.PI * 2 / NUM_PIECES) * i;
      const spreadX = Math.cos(angle) * 10;
      const spreadY = Math.sin(angle) * 8;
      const piece = this.add.ellipse(
        CARD_X + spreadX, 
        CARD_Y + spreadY, 
        PIECE_SIZE, 
        PIECE_SIZE, 
        CARD_COLOR
      );
      piece.setStrokeStyle(1, CARD_STROKE);
      this.cardPieces.push(piece);
    }
  }

  private animateCutscene(_dt: number) {
    // Smush jumps toward Ebo
    const progress = this.time.now / CUTSCENE_DURATION;
    
    if (progress < 1) {
      // Smush moves from player position to Ceci position
      this.smush.x = PLAYER_START_X + progress * (CECI_X - PLAYER_START_X);
      this.smush.y = SMUSH_Y - progress * 5;
      this.card.setAlpha(1 - progress);
    } else {
      // Card breaks
      this.card.setVisible(false);
      this.startChase();
    }
  }

  private startChase() {
    this.sceneState = "chase";
    
    // Ebo gets scared and runs
    this.time.delayedCall(CHASE_DELAY, () => {
      this.showDialog("Ceci: Oh no! Smush scared Ebo! The card pieces are flying everywhere!");
      this.sceneState = "sad_dialogue";
    });
  }

  private animateChase(_dt: number) {
    // Ebo runs left (off screen)
    this.ebo.x -= EBO_SPEED * _dt;
    this.ebo.y += Math.sin(this.time.now / 100) * 20 * _dt;
    
    // Smush chases Ebo
    if (this.smush.x > this.ebo.x + 10) {
      this.smush.x -= SMUSH_SPEED * _dt;
    }
    
    // Card pieces fly around
    this.cardPieces.forEach((piece, i) => {
      const angle = (this.time.now / 500 + i * 1.5) % (Math.PI * 2);
      piece.x += Math.cos(angle) * PIECE_SPEED * _dt;
      piece.y += Math.sin(angle) * PIECE_SPEED * _dt;
    });
  }

  private animateCeciRuns(dt: number) {
    // Ceci runs after pieces (right edge of screen)
    this.ceci.x += CECI_SPEED * dt;
    
    if (this.ceci.x > SCREEN_WIDTH) {
      this.sceneState = "fragments_scattered";
      this.showDialog("The fragments scattered into the void...");
      
      // After a delay, Grayson realizes something
      this.time.delayedCall(2000, () => {
        this.sceneState = "transformation_start";
        this.showDialog("Grayson: Wait... what's happening to me?");
        
        // Start glowing effect
        this.tweens.add({
          targets: this.grayson,
          alpha: { from: 1, to: 0.5 },
          yoyo: true,
          repeat: 3,
          duration: 300,
        });
        
        // The big realization
        this.time.delayedCall(2000, () => {
          this.showDialog("Grayson: Am I getting... PIXELS?!");
          
          // Start transformation
          this.time.delayedCall(1500, () => {
            this.startTransformation();
          });
        });
      });
    }
  }

  private ceciRuns() {
    this.hideDialog();
    this.sceneState = "ceci_runs";
    
    // Make pieces visible and scattered
    this.cardPieces.forEach((piece, i) => {
      piece.setPosition(SCREEN_CENTER_X + i * 30, CARD_Y + i * 15);
    });
  }

  private showDialog(message: string) {
    this.dialogBox.setVisible(true);
    this.dialogText.setText(message).setVisible(true);
    this.hintText.setVisible(false);
  }

  private hideDialog() {
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
    this.hintText.setVisible(true);
  }
  
  private startTransformation() {
    this.hideDialog();
    this.sceneState = "transforming";
    this.transformationTime = 0;
    
    // Import pixel sprite function dynamically
    import("../utils/sprites").then(({ createGraysonSprite }) => {
      // Create pixel version at Grayson's position
      this.pixelGrayson = createGraysonSprite(this, this.grayson.x, this.grayson.y);
      this.pixelGrayson.setAlpha(0);
      this.pixelGrayson.setScale(0.5);
      
      // Create glitch effect graphics
      this.glitchGraphics = this.add.graphics();
      this.glitchGraphics.setDepth(10);
    });
  }
  
  private animateTransformation(dt: number) {
    this.transformationTime += dt;
    
    if (!this.pixelGrayson) return;
    
    const duration = 2.5; // Total transformation time
    const progress = Math.min(this.transformationTime / duration, 1);
    
    if (progress < 0.8) {
      // Glitch between ASCII and pixel
      const flickerSpeed = 10 + progress * 20; // Speed up over time
      const showPixel = Math.floor(this.transformationTime * flickerSpeed) % 2 === 0;
      
      this.grayson.setAlpha(showPixel ? 0 : 1);
      this.pixelGrayson.setAlpha(showPixel ? 1 : 0);
      this.pixelGrayson.setScale(0.5 + progress * 0.5);
      
      // Random glitch rectangles
      if (this.glitchGraphics && Math.random() < 0.3) {
        this.glitchGraphics.clear();
        this.glitchGraphics.fillStyle(Math.random() > 0.5 ? 0x00d4ff : 0xff00ff, 0.3);
        this.glitchGraphics.fillRect(
          Math.random() * SCREEN_WIDTH,
          Math.random() * SCREEN_HEIGHT,
          Math.random() * 50,
          Math.random() * 50
        );
      }
    } else if (progress < 1) {
      // Finalize transformation
      this.grayson.setAlpha(0);
      this.pixelGrayson.setAlpha(1);
      this.pixelGrayson.setScale(1);
      
      if (this.glitchGraphics) {
        this.glitchGraphics.clear();
      }
    } else {
      // Transformation complete
      this.enterVoid();
    }
  }
  
  private enterVoid() {
    this.sceneState = "void_entry";
    
    // Big dramatic text
    this.voidText = this.add.text(SCREEN_CENTER_X, SCREEN_CENTER_Y, "ENTERING THE VOID...", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#00d4ff",
      fontStyle: "bold",
      align: "center",
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0.5).setAlpha(0);
    
    // Text appear
    this.tweens.add({
      targets: this.voidText,
      alpha: 1,
      duration: 500,
      ease: "Power2",
    });
    
    // Neon grid effect
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0xff00ff, 0.5);
    gridGraphics.setAlpha(0);
    
    // Draw the grid
    const gridSize = 16;
    for (let x = 0; x <= SCREEN_WIDTH; x += gridSize) {
      gridGraphics.lineBetween(x, 0, x, SCREEN_HEIGHT);
    }
    for (let y = 0; y <= SCREEN_HEIGHT; y += gridSize) {
      gridGraphics.lineBetween(0, y, SCREEN_WIDTH, y);
    }
    
    // Fade in the grid
    this.tweens.add({
      targets: gridGraphics,
      alpha: 1,
      duration: 1500,
      ease: "Power2"
    });
    
    // Fade out and transition to game
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1000, () => {
        this.scene.start("Game");
      });
    });
  }
}