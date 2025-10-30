import Phaser from "phaser";
import { createGraysonTopDownSprite } from "../utils/sprites/GraysonTopDownSprite";
import { setupControls, shouldCloseDialogue } from "../utils/controls";
import type { GameControls } from "../utils/controls";
import { HelpMenu } from "../utils/helpMenu";
import { PauseMenu } from "../utils/pauseMenu";

/**
 * Ice Hockey Game Scene - Everett Silvertips
 * Level 2: Find Ceci at the hockey game
 */
export default class IceHockeyScene extends Phaser.Scene {
  private controls!: GameControls;
  private helpMenu!: HelpMenu;
  private pauseMenu!: PauseMenu;
  
  private player!: Phaser.GameObjects.Container;
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogVisible = false;
  
  private hasEnteredField = false;
  private hasShownRealization = false;

  constructor() {
    super("IceHockey");
  }

  create() {
    // Set camera to respect pixel art settings
    this.cameras.main.setRoundPixels(true);
    
    // Create ice hockey rink
    this.createIceRink();
    
    // Create Grayson (top-down view) - starts at goal net (bottom)
    // Position him at center of field horizontally (160), bottom of field vertically
    this.player = createGraysonTopDownSprite(this, 160, 160);
    this.player.setDepth(10);
    
    // Setup controls
    this.controls = setupControls(this);
    this.helpMenu = new HelpMenu(this);
    this.pauseMenu = new PauseMenu(this);
    
    // Create dialogue UI
    this.createDialogUI();
    
    // Grayson enters the field
    this.time.delayedCall(500, () => {
      this.graysonEntersField();
    });
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
  
  private createCrowd() {
    const crowdColors = [
      0xff6b6b, // Red
      0x4ecdc4, // Teal
      0xffe66d, // Yellow
      0x95e1d3, // Mint
      0xf38181, // Pink
      0xa8e6cf, // Light green
      0xffd93d, // Gold
      0x6c5ce7, // Purple
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
    // From x:240 to x:315 (starting just after right board at x:235)
    for (let x = 240; x < 315; x += 8) {
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
  
  private createDialogUI() {
    this.dialogBox = this.add.rectangle(160, 160, 300, 40, 0x000000, 0.6)
      .setStrokeStyle(1, 0x99bbff, 0.9)
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(100);
    
    this.dialogText = this.add.text(20, 146, "", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#dff1ff",
      wordWrap: { width: 280 },
      resolution: 2,
    }).setOrigin(0, 0).setVisible(false).setDepth(100);
  }
  
  private graysonEntersField() {
    // Grayson walks from bottom goal up into the field
    this.tweens.add({
      targets: this.player,
      y: 140, // Walk into the field
      duration: 2000,
      ease: "Linear",
      onComplete: () => {
        this.hasEnteredField = true;
        
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
  }
  
  private showDialog(message: string) {
    this.dialogVisible = true;
    this.dialogBox.setVisible(true);
    this.dialogText.setText(message).setVisible(true);
  }
  
  private hideDialog() {
    this.dialogVisible = false;
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
  }
  
  update() {
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
    
    // Handle dialogue
    if (this.dialogVisible) {
      if (shouldCloseDialogue(this.controls)) {
        this.hideDialog();
      }
      return;
    }
    
    // Movement will be added later
  }
}


