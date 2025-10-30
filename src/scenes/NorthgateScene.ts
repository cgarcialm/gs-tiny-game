import Phaser from "phaser";
import { createGraysonSprite, updateGraysonWalk, createCeciSprite } from "../utils/sprites";

export default class NorthgateScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerSprite!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private escalators: Phaser.GameObjects.Rectangle[] = [];
  private train!: Phaser.Physics.Arcade.Sprite;
  private ceci!: Phaser.GameObjects.Container;
  
  private speed = 100;
  private jumpVelocity = -200;
  
  private cardFragmentCollected = false;
  
  // Dialogue
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogVisible = false;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super("Northgate");
  }

  create() {
    this.cameras.main.setRoundPixels(true);
    
    // Background - metro station aesthetic
    this.createStationBackground();
    
    // Create platforms
    this.createPlatforms();
    
    // Create train
    this.createTrain();
    
    // Create player with physics
    this.createPlayer();
    
    // Create Ceci (on top platform)
    this.createCeci();
    
    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
      SPACE: this.input.keyboard!.addKey("SPACE"),
      E: this.input.keyboard!.addKey("E"),
      ENTER: this.input.keyboard!.addKey("ENTER"),
      ESC: this.input.keyboard!.addKey("ESC"),
    };
    
    // UI
    this.createUI();
  }
  
  private createStationBackground() {
    // Dark metro background
    const bg = this.add.rectangle(160, 90, 320, 180, 0x1a1a2e, 1);
    bg.setOrigin(0.5);
    
    // Metro grid lines
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x00d4ff, 0.2);
    
    // Vertical lines
    for (let x = 0; x <= 320; x += 32) {
      graphics.lineBetween(x, 0, x, 180);
    }
    
    // Horizontal lines
    for (let y = 0; y <= 180; y += 32) {
      graphics.lineBetween(0, y, 320, y);
    }
    
    // Station sign
    this.add.text(160, 10, "NORTHGATE STATION", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#00d4ff",
      fontStyle: "bold",
      resolution: 1,
    }).setOrigin(0.5);
  }
  
  private createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    
    // Bottom platform (ground)
    const ground = this.add.rectangle(160, 170, 320, 10, 0x555555);
    this.platforms.add(ground);
    
    // Platform 1 (mid-low)
    const platform1 = this.add.rectangle(100, 125, 120, 8, 0x666666);
    this.platforms.add(platform1);
    
    // Platform 2 (mid-high)
    const platform2 = this.add.rectangle(220, 45, 120, 8, 0x666666);
    this.platforms.add(platform2);
    
    // Platform 3 (top)
    const platform3 = this.add.rectangle(160, 85, 320, 8, 0x777777);
    this.platforms.add(platform3);
    
    // Visual rails for top platform
    this.add.rectangle(160, 85, 320, 2, 0xffeb3b, 0.8);
    
    // Create all escalators
    this.createEscalators();
  }
  
  private createEscalators() {
    // Escalator 1: Ground (170) to Platform 1 (125)
    this.createEscalatorVisual(50, 170, 125);
    
    // Escalator 2: Platform 1 (125) to Platform 2 (85)
    this.createEscalatorVisual(155, 125, 85);
    
    // Escalator 3: Platform 2 (85) to Top Platform (45)
    this.createEscalatorVisual(255, 85, 45);
  }
  
  private createEscalatorVisual(x: number, bottomY: number, topY: number) {
    const width = 30;
    const height = bottomY - topY; // Distance from bottom to top
    const centerY = (bottomY + topY) / 2;
    
    // Escalator zone (collision area)
    const escalatorZone = this.add.rectangle(x, centerY, width, height, 0x888888, 0.6);
    this.escalators.push(escalatorZone);
    
    // Visual steps
    const steps = this.add.graphics();
    steps.lineStyle(1, 0xaaaaaa, 0.8);
    const numSteps = Math.floor(height / 7);
    for (let i = 0; i < numSteps; i++) {
      const stepY = topY + i * 7;
      steps.lineBetween(x - width/2, stepY, x + width/2, stepY);
    }
    
    // Arrow indicating up
    this.add.text(x, centerY, "↑", {
      fontSize: "16px",
      color: "#00ff00",
    }).setOrigin(0.5);
  }
  
  private createTrain() {
    // Train on level 3 (platform 2) - Seattle Light Rail colors
    // Ceci is on level 4 (top platform) because she already got off
    this.train = this.physics.add.sprite(400, 65, '');
    const trainWidth = 100;
    const trainHeight = 35;
    this.train.setSize(trainWidth, trainHeight);
    this.train.setDisplaySize(trainWidth, trainHeight);
    
    // Visual representation - Seattle Light Rail style (blue/white/green)
    const trainGraphics = this.add.graphics();
    
    // Main body - light blue/teal
    trainGraphics.fillStyle(0x0077be, 1);
    trainGraphics.fillRect(0, 0, trainWidth, trainHeight);
    
    // Top stripe - white
    trainGraphics.fillStyle(0xffffff, 1);
    trainGraphics.fillRect(0, 0, trainWidth, 8);
    
    // Bottom stripe - green (Sound Transit green)
    trainGraphics.fillStyle(0x00843d, 1);
    trainGraphics.fillRect(0, trainHeight - 6, trainWidth, 6);
    
    // Dark outline
    trainGraphics.lineStyle(2, 0x003d5c);
    trainGraphics.strokeRect(0, 0, trainWidth, trainHeight);
    
    // Windows (dark blue tint)
    trainGraphics.fillStyle(0x1a1a2e, 0.7);
    trainGraphics.fillRect(10, 10, 15, 15);
    trainGraphics.fillRect(35, 10, 15, 15);
    trainGraphics.fillRect(60, 10, 15, 15);
    trainGraphics.fillRect(85, 10, 10, 15);
    
    const trainTexture = trainGraphics.generateTexture('soundtransit-train', trainWidth, trainHeight);
    trainGraphics.destroy();
    
    this.train.setTexture('soundtransit-train');
    this.train.setVelocityX(-150); // Move left
    (this.train.body as Phaser.Physics.Arcade.Body).setAllowGravity(false); // Train doesn't fall
    
    // Respawn train every 5 seconds
    this.time.addEvent({
      delay: 8000,
      callback: () => {
        this.train.x = 400;
        this.train.setVelocityX(-150);
      },
      loop: true
    });
  }
  
  private createPlayer() {
    // Create physics sprite for player (invisible)
    this.player = this.physics.add.sprite(50, 155, '');
    this.player.setSize(16, 20); // Tighter hitbox for better feet alignment
    this.player.setOffset(1, 6); // More offset to align feet with platforms
    this.player.setCollideWorldBounds(true);
    
    // Make physics body invisible
    this.player.setAlpha(0);
    
    // Create visual sprite
    this.playerSprite = createGraysonSprite(this, this.player.x, this.player.y);
    
    // Physics setup
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.train, this.hitByTrain, undefined, this);
  }
  
  private createCeci() {
    // Ceci on top platform (away from train path)
    this.ceci = createCeciSprite(this, 200, 35);
  }
  
  private createUI() {
    // Prompt text
    this.promptText = this.add.text(0, 0, "E to interact", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#cfe8ff",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: { left: 4, right: 4, top: 2, bottom: 2 },
      resolution: 2,
    }).setOrigin(0.5).setVisible(false);
    
    // Dialogue box
    this.dialogBox = this.add.rectangle(160, 160, 300, 40, 0x000000, 0.6)
      .setStrokeStyle(1, 0x99bbff, 0.9)
      .setOrigin(0.5)
      .setVisible(false);
    
    this.dialogText = this.add.text(20, 146, "", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#dff1ff",
      wordWrap: { width: 280 },
      resolution: 2,
    }).setOrigin(0, 0).setVisible(false);
  }

  update() {
    if (!this.player || !this.playerSprite) return;
    
    // Handle dialogue
    if (this.dialogVisible) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || 
          Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
        this.hideDialog();
      }
      return;
    }
    
    // Player movement
    const onGround = this.player.body!.touching.down;
    
    // Horizontal movement
    if (this.cursors.left?.isDown || this.keys.A.isDown) {
      this.player.setVelocityX(-this.speed);
      this.playerSprite.setScale(1, 1); // Face left
    } else if (this.cursors.right?.isDown || this.keys.D.isDown) {
      this.player.setVelocityX(this.speed);
      this.playerSprite.setScale(-1, 1); // Face right
    } else {
      this.player.setVelocityX(0);
    }
    
    // Jumping
    if ((this.cursors.up?.isDown || this.keys.W.isDown || this.keys.SPACE.isDown) && onGround) {
      this.player.setVelocityY(this.jumpVelocity);
    }
    
    // Escalator logic
    this.checkEscalator();
    
    // Update walking animation
    const isMoving = Math.abs(this.player.body!.velocity.x) > 0;
    updateGraysonWalk(this.playerSprite, isMoving);
    
    // Sync sprite position with physics body
    this.playerSprite.x = Math.round(this.player.x);
    this.playerSprite.y = Math.round(this.player.y);
    
    // Check proximity to Ceci
    this.checkCeciProximity();
  }
  
  private checkEscalator() {
    // Check if player overlaps with any escalator
    const playerBounds = this.player.getBounds();
    let onAnyEscalator = false;
    
    for (const escalator of this.escalators) {
      const bounds = escalator.getBounds();
      
      if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, playerBounds)) {
        onAnyEscalator = true;
        // Auto-move player up on escalator
        this.player.setVelocityY(-100);
        break;
      }
    }
  }
  
  private checkCeciProximity() {
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.ceci.x,
      this.ceci.y
    );
    
    const near = distance < 35;
    this.promptText.setVisible(near && !this.cardFragmentCollected);
    
    if (near) {
      this.promptText.setPosition(this.ceci.x, this.ceci.y - 20);
      
      if (Phaser.Input.Keyboard.JustDown(this.keys.E) && !this.cardFragmentCollected) {
        this.collectCardFragment();
      }
    }
  }
  
  private hitByTrain() {
    // Player death - respawn at start
    this.player.x = 50;
    this.player.y = 155;
    this.player.setVelocity(0, 0);
    
    // Flash effect
    this.cameras.main.flash(200, 255, 0, 0);
  }
  
  private collectCardFragment() {
    this.cardFragmentCollected = true;
    this.promptText.setVisible(false);
    this.showDialog("Ceci: This is my first time at this station!\nSo glad we found each other!");
    
    // TODO: Add card fragment visual and transition to next level
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
}

