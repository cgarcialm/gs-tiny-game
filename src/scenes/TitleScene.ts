import Phaser from "phaser";
import { getHorizontalAxis } from "../utils/controls";
import type { GameControls } from "../utils/controls";
import { HelpMenu } from "../utils/helpMenu";
import { PauseMenu } from "../utils/pauseMenu";
import { DialogueManager } from "../utils/dialogueManager";
import { handleMenuInput } from "../utils/menuHandler";
import { initializeGameScene } from "../utils/sceneSetup";
import { fadeToScene } from "../utils/sceneTransitions";
import { createGraysonSprite } from "../utils/sprites";
import { GameStateManager } from "../managers/GameStateManager";
import { SCENES } from "../config/sceneConstants";
import {
  fetchLeaderboard,
  formatRunDurationLoose,
  formatSeattleArrivalFromDurationMs,
  getPlayerName,
  setPlayerName
} from "../services/leaderboard";

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
const LEADERBOARD_X = 226;
const LEADERBOARD_Y = 30;
const NAME_GATE_TITLE_Y = 26;
const NAME_GATE_SCORES_Y = 74;
const NAME_GATE_INPUT_Y = 140;

// Sizes
const CARD_WIDTH = 20;
const CARD_HEIGHT = 12;
const PIECE_SIZE = 4;
const NUM_PIECES = 15;
const CHAR_FONT_SIZE = 7;
const TITLE_FONT_SIZE = 12;
const HEART_FONT_SIZE = 8;
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
  private gameState!: GameStateManager;
  private controls!: GameControls;
  private helpMenu!: HelpMenu;
  private pauseMenu!: PauseMenu;
  private dialogueManager!: DialogueManager;
  // @ts-ignore - CheatConsole used for side effects
  private _cheatConsole: any;
  private grayson!: Phaser.GameObjects.Text;
  private ceci!: Phaser.GameObjects.Text;
  private smush!: Phaser.GameObjects.Text;
  private ebo!: Phaser.GameObjects.Text;
  private card!: Phaser.GameObjects.Rectangle;
  private sceneState: SceneState = "approaching";
  
  private hintText!: Phaser.GameObjects.Text;
  private leaderboardText!: Phaser.GameObjects.Text;
  private nameGateContainer!: Phaser.GameObjects.Container;
  private nameValueText!: Phaser.GameObjects.Text;
  private nameErrorText!: Phaser.GameObjects.Text;
  private nameScoresText!: Phaser.GameObjects.Text;
  private nameScoresLabelText!: Phaser.GameObjects.Text;
  private nameScoresValueText!: Phaser.GameObjects.Text;
  private nameEntryActive = false;
  private nameInput = "";
  private nameBlinkTween?: Phaser.Tweens.Tween;
  private playerTagText!: Phaser.GameObjects.Text;
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
    // Initialize common scene elements (camera, controls, menus, dialogue, cheat console)
    const setup = initializeGameScene(this);
    this.controls = setup.controls;
    this.helpMenu = setup.helpMenu;
    this.pauseMenu = setup.pauseMenu;
    this.dialogueManager = setup.dialogueManager;
    this.gameState = setup.gameState;
    // @ts-ignore - CheatConsole used for side effects (global keyboard listener)
    this._cheatConsole = setup.cheatConsole;

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

    this.hintText = this.add.text(SCREEN_CENTER_X, HINT_TEXT_Y, "← → or A/D to move", {
      fontFamily: "monospace",
      fontSize: `${HINT_FONT_SIZE}px`,
      color: TITLE_COLOR,
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0.5);

    const savedName = getPlayerName().trim();
    this.playerTagText = this.add.text(8, 10, savedName ? `PLAYER: ${savedName}` : "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ffeab6",
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0, 0).setAlpha(savedName ? 1 : 0);

    this.leaderboardText = this.add.text(LEADERBOARD_X, LEADERBOARD_Y, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#9ee6ff",
      lineSpacing: 2,
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0, 0);
    this.leaderboardText.setVisible(false);

    this.activateNameGate(savedName);
    
    // Note: No help hint in TitleScene - this is before the game starts
    // Help hint will appear after Eboshi interaction in GameScene
  }

  update() {
    const dt = this.game.loop.delta / 1000;

    if (this.nameEntryActive) {
      return;
    }

    // Handle menu input (ESC for pause, H for help, M for mute)
    // In title scene, "exit to title" means restart the scene
    const openLeaderboard = () => {
      this.scene.pause();
      this.scene.launch(SCENES.LEADERBOARD, { returnScene: this.sys.settings.key });
    };
    if (handleMenuInput(this, this.controls, this.helpMenu, this.pauseMenu, () => {
      this.scene.restart();
    }, openLeaderboard, this._cheatConsole, this.gameState)) {
      return; // Menus are active, don't process game input
    }

    switch (this.sceneState) {
      case "approaching":
        this.handleMovement(dt);
        this.checkApproachCeci();
        break;
      
      case "card_ready":
        // Waiting for ENTER to look at card
        if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
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
        if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
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
    const vx = getHorizontalAxis(this, this.controls);

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
      this.showDialog("Ceci: I made you a one-year-memories card! Press ENTER to look at it.");
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
      this.showDialog("The card held memories... without them... nothingness!");
      
      // After a delay, Grayson realizes something
      this.time.delayedCall(3000, () => {
        this.sceneState = "transformation_start";
        this.showDialog("Grayson: Wait... what's happening to me?");
        
        // Start glowing effect
        this.tweens.add({
          targets: this.grayson,
          alpha: { from: 1, to: 0.5 },
          yoyo: true,
          repeat: 5,
          duration: 300,
        });
        
        // The big realization
        this.time.delayedCall(3000, () => {
          this.showDialog("Grayson: Am I getting... PIXELS?!");
          
          // Start transformation
          this.time.delayedCall(2500, () => {
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
    this.dialogueManager.show(message);
    this.hintText.setVisible(false);
  }

  private hideDialog() {
    this.dialogueManager.hide();
    this.hintText.setVisible(true);
  }
  
  private startTransformation() {
    this.hideDialog();
    this.sceneState = "transforming";
    this.transformationTime = 0;
    
    // Start 8-bit music (looping, persists across scenes)
    const music = this.sound.add('skyline-8bit', { loop: true, volume: 0.6 });
    music.play();
    
    // Store music using GameStateManager (automatically stops previous music if any)
    this.gameState.setCurrentMusic(music);
    
    // Create pixel version at Grayson's position (now using static import)
    this.pixelGrayson = createGraysonSprite(this, this.grayson.x + 15, this.grayson.y + 10);
    this.pixelGrayson.setAlpha(0);
    this.pixelGrayson.setScale(0.5);
    
    // Create glitch effect graphics
    this.glitchGraphics = this.add.graphics();
    this.glitchGraphics.setDepth(10);
  }
  
  private animateTransformation(dt: number) {
    this.transformationTime += dt;
    
    if (!this.pixelGrayson) return;
    
    const duration = 4; // Longer transformation for more drama
    const progress = Math.min(this.transformationTime / duration, 1);
    
    if (progress < 0.85) {
      // DRAMATIC flicker between ASCII and pixel - MUCH slower
      const flickerSpeed = 2 + progress * 6; // 2-8 flickers per second (very visible!)
      const showPixel = Math.floor(this.transformationTime * flickerSpeed) % 2 === 0;
      
      // Lower alpha makes Grayson almost invisible during flicker
      this.grayson.setAlpha(showPixel ? 1 : 0);
      this.pixelGrayson.setAlpha(showPixel ? 1 : 0);
      this.pixelGrayson.setScale(0.5 + progress * 0.5);
      
      // Bigger, brighter, more frequent glitch rectangles
      if (this.glitchGraphics && Math.random() < 0.6) {
        this.glitchGraphics.clear();
        const color = Math.random() > 0.5 ? 0x00d4ff : 0xff00ff;
        this.glitchGraphics.fillStyle(color, 0.5);
        
        // Multiple large glitch blocks
        for (let i = 0; i < 4; i++) {
          this.glitchGraphics.fillRect(
            Math.random() * SCREEN_WIDTH,
            Math.random() * SCREEN_HEIGHT,
            Math.random() * 100 + 30,
            Math.random() * 100 + 30
          );
        }
      }
      
      // Screen shake gets stronger over time
      if (progress > 0.3) {
        this.cameras.main.shake(50, 0.003 * (progress - 0.3));
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
    
    // Reset game progress - always start from level 0 when coming from title
    // Note: Don't use resetProgress() here because it stops music, and we want to keep it playing
    this.gameState.setCompletedLevels(0);
    this.gameState.resetHelpHint(); // Reset help hint for new game
    this.gameState.clearCheatUsed();
    // Set flag to ignore DEBUG_START_LEVEL (this is a proper story start)
    this.gameState.markFromTitleScene();
    
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
      fadeToScene(this, SCENES.GAME, 1000);
    });
  }

  private refreshNameEntryText() {
    const display = this.nameInput.length > 0 ? this.nameInput : "_";
    this.nameValueText.setText(display);
  }

  private activateNameGate(initialName: string) {
    this.nameEntryActive = true;
    this.nameInput = initialName;
    this.hintText.setVisible(false);
    this.leaderboardText.setVisible(false);

    const overlay = this.add.rectangle(160, 90, 320, 180, 0x000000, 0.88);
    overlay.setDepth(500);

    const panel = this.add.rectangle(160, 90, 304, 168, 0x0b0b10, 0.98)
      .setStrokeStyle(2, 0x00d4ff)
      .setDepth(501);

    const title = this.add.text(160, NAME_GATE_TITLE_Y, "ENTER PLAYER NAME", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#00d4ff",
      fontStyle: "bold",
      align: "center",
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0.5).setDepth(502);

    const subtitle = this.add.text(160, NAME_GATE_TITLE_Y + 14, "3-16 chars • letters, numbers, space, _ -", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#9ee6ff",
      align: "center",
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0.5).setDepth(502);

    this.nameValueText = this.add.text(160, NAME_GATE_INPUT_Y, "_", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
      align: "center",
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0.5).setDepth(502);

    this.nameBlinkTween?.stop();
    this.nameBlinkTween = this.tweens.add({
      targets: this.nameValueText,
      alpha: 0.2,
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.nameErrorText = this.add.text(160, NAME_GATE_INPUT_Y + 16, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ffaaaa",
      align: "center",
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0.5).setDepth(502);

    this.nameScoresText = this.add.text(160, NAME_GATE_SCORES_Y - 10, "BEST SCORES", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ffeab6",
      align: "center",
      lineSpacing: 2,
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0.5).setDepth(502);

    this.nameScoresLabelText = this.add.text(56, NAME_GATE_SCORES_Y, "Loading...", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#9ee6ff",
      align: "left",
      lineSpacing: 2,
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0, 0).setDepth(502);

    this.nameScoresValueText = this.add.text(160, NAME_GATE_SCORES_Y, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#c9b6ff",
      align: "left",
      lineSpacing: 2,
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0, 0).setDepth(502);

    const footer = this.add.text(160, 168, "Press ENTER to continue", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#888888",
      align: "center",
      resolution: TEXT_RESOLUTION,
    }).setOrigin(0.5).setDepth(502);

    this.nameGateContainer = this.add.container(0, 0, [
      overlay,
      panel,
      title,
      subtitle,
      this.nameValueText,
      this.nameErrorText,
      this.nameScoresText,
      this.nameScoresLabelText,
      this.nameScoresValueText,
      footer
    ]);
    this.nameGateContainer.setDepth(500);

    this.refreshNameEntryText();
    this.input.keyboard?.on("keydown", this.handleNameInput, this);
    void this.loadNameGateScores();
  }

  private async loadNameGateScores() {
    try {
      const results = await Promise.allSettled([
        fetchLeaderboard(1, "ice_hockey"),
        fetchLeaderboard(1, "seattle_traffic"),
        fetchLeaderboard(1, "farmers_market"),
        fetchLeaderboard(1, "northgate"),
      ]);
      const ice = results[0].status === "fulfilled" ? results[0].value : [];
      const sea = results[1].status === "fulfilled" ? results[1].value : [];
      const farm = results[2].status === "fulfilled" ? results[2].value : [];
      const ng = results[3].status === "fulfilled" ? results[3].value : [];
      const rows = [
        this.formatNameGateRow("NORTHGATE", ng[0], "northgate"),
        this.formatNameGateRow("ICE HOCKEY", ice[0], "ice_hockey"),
        this.formatNameGateRow("SEATTLE TRAFFIC", sea[0], "seattle_traffic"),
        this.formatNameGateRow("FARMERS MARKET", farm[0], "farmers_market"),
      ];
      this.nameScoresLabelText.setText(rows.map((row) => row.label).join("\n"));
      this.nameScoresValueText.setText(rows.map((row) => row.value).join("\n"));
    } catch {
      this.nameScoresLabelText.setText("Unavailable");
      this.nameScoresValueText.setText("");
    }
  }

  private formatNameGateRow(
    label: string,
    result: { duration_ms?: number; deaths?: number; player_name?: string } | null,
    key: "ice_hockey" | "seattle_traffic" | "farmers_market" | "northgate"
  ): { label: string; value: string } {
    if (!result || result.duration_ms === undefined) {
      return { label: `${label}:`, value: "-" };
    }
    const timeLabel =
      key === "seattle_traffic"
        ? formatSeattleArrivalFromDurationMs(result.duration_ms)
        : formatRunDurationLoose(result.duration_ms);
    const nameTag = typeof result.player_name === "string" ? result.player_name.slice(0, 10) : "Anon";
    const deaths = result.deaths ?? 0;
    return { label: `${label}:`, value: `${nameTag} ${timeLabel} (${deaths} deaths)` };
  }

  private isAllowedNameChar(char: string): boolean {
    return /^[a-zA-Z0-9 _-]$/.test(char);
  }

  private sanitizePlayerName(name: string): string {
    return name.trim().replace(/\s+/g, " ");
  }

  private handleNameInput(event: KeyboardEvent) {
    if (!this.nameEntryActive) return;
    this.nameErrorText.setText("");

    if (event.key === "Backspace") {
      this.nameInput = this.nameInput.slice(0, -1);
      this.refreshNameEntryText();
      return;
    }

    if (event.key === "Enter") {
      const cleaned = this.sanitizePlayerName(this.nameInput);
      if (cleaned.length < 3 || cleaned.length > 16) {
        this.nameErrorText.setText("Name must be 3-16 chars");
        return;
      }
      setPlayerName(cleaned);
      this.nameEntryActive = false;
      this.nameInput = cleaned;
      this.playerTagText.setText(`PLAYER: ${cleaned}`).setAlpha(1);
      this.nameValueText.setText(cleaned);
      this.nameBlinkTween?.stop();
      this.nameBlinkTween = undefined;
      this.input.keyboard?.off("keydown", this.handleNameInput, this);
      this.nameGateContainer.destroy();
      this.hintText.setVisible(true);
      return;
    }

    if (event.key.length === 1 && this.isAllowedNameChar(event.key)) {
      if (this.nameInput.length >= 16) return;
      this.nameInput += event.key;
      this.refreshNameEntryText();
    }
  }

  // leaderboard display removed from title scene
}
