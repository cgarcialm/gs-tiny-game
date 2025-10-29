import Phaser from "phaser";
import { createGraysonSprite, updateGraysonWalk, createEboshiSprite } from "../utils/PixelSprite";

type DialogueState = "idle" | "open";

export default class GameScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private player!: Phaser.GameObjects.Container;
  private npc!: Phaser.GameObjects.Container;

  private speed = 80; // px/s
  private promptText!: Phaser.GameObjects.Text;

  // dialogue UI
  private dialogState: DialogueState = "idle";
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogLines: string[] = [
    "Hey there! Nice neon grid, huh? You are in the void!",
    "Press Esc to close. Space/Enter to continue."
  ];
  private dialogIndex = 0;

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

    // "Press E to talk" prompt (hidden by default)
    this.promptText = this.add
      .text(0, 0, "E to talk", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#cfe8ff",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Dialogue UI (hidden)
    this.createDialogUI();
    this.hideDialog();
  }

  private createCustomGrid() {
    const gridWidth = 320;
    const gridHeight = 180;
    const cellSize = 16;
    const bgColor = 0x0a1d3d; // Intense blue background
    const lineColor = 0x00ff88; // Greener teal
    const lineAlpha = 0.3; // A little more transparent
    
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
    if (this.dialogIndex >= this.dialogLines.length) {
      this.dialogIndex = 0;
      this.hideDialog();
    } else {
      this.showDialog(this.dialogLines[this.dialogIndex]);
    }
  }

  update() {
    const dt = this.game.loop.delta / 1000;

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
    }
    this.player.x += vx * this.speed * dt;
    this.player.y += vy * this.speed * dt;

    // Keep inside 320x180 play area (tiny padding)
    this.player.x = Phaser.Math.Clamp(this.player.x, 6, 320 - 6);
    this.player.y = Phaser.Math.Clamp(this.player.y, 6, 180 - 6);
    
    // Update walking animation
    updateGraysonWalk(this.player, isMoving);

    // Proximity check to NPC
    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.npc.x,
      this.npc.y
    );

    const near = d < 18; // distance threshold to show prompt
    this.promptText.setVisible(near);
    if (near) {
      // anchor prompt above NPC
      this.promptText.setPosition(this.npc.x, this.npc.y - 14);

      // Press E to talk
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.dialogIndex = 0;
        this.showDialog(this.dialogLines[this.dialogIndex]);
      }
    }
  }
}
