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


