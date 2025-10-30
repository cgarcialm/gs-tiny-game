import Phaser from "phaser";
import { createGraysonSprite, updateGraysonWalk, createCeciSprite } from "../utils/sprites";

export default class NorthgateScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerSprite!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private escalator!: Phaser.GameObjects.Rectangle;
  private train!: Phaser.Physics.Arcade.Sprite;
  private ceci!: Phaser.GameObjects.Container;
  
  private speed = 100;
  private jumpVelocity = -200;
  
  private onEscalator = false;
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
    
    // Create escalator
    this.createEscalator();
    
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
    const ground = this.add.rectangle(160, 165, 320, 10, 0x555555);
    this.platforms.add(ground);
    
    // Platform 1 (mid-low)
    const platform1 = this.add.rectangle(100, 130, 120, 8, 0x666666);
    this.platforms.add(platform1);
    
    // Platform 2 (mid-high) - has ladder access
    const platform2 = this.add.rectangle(220, 90, 120, 8, 0x666666);
    this.platforms.add(platform2);
    
    // Platform 3 (top) - train platform
    const platform3 = this.add.rectangle(160, 40, 320, 8, 0x777777);
    this.platforms.add(platform3);
    
    // Visual rails for platforms
    this.add.rectangle(160, 42, 320, 2, 0xffeb3b, 0.8);
  }
  
  private createEscalator() {
    // Escalator connecting bottom to mid platform
    this.escalator = this.add.rectangle(200, 147, 30, 35, 0x888888, 0.6);
    
    // Escalator steps visual
    const steps = this.add.graphics();
    steps.lineStyle(1, 0xaaaaaa, 0.8);
    for (let i = 0; i < 5; i++) {
      const y = 147 - 15 + i * 7;
      steps.lineBetween(185, y, 215, y);
    }
    
    // Arrow indicating up
    this.add.text(200, 147, "↑", {
      fontSize: "16px",
      color: "#00ff00",
    }).setOrigin(0.5);
  }
  
  private createTrain() {
    // Train on middle level (platform 2)
    this.train = this.physics.add.sprite(400, 80, '');
    this.train.setSize(80, 20);
    this.train.setDisplaySize(80, 20);
    
    // Visual representation
    const trainGraphics = this.add.graphics();
    trainGraphics.fillStyle(0xff0000, 1);
    trainGraphics.fillRect(0, 0, 80, 20);
    trainGraphics.lineStyle(2, 0xaa0000);
    trainGraphics.strokeRect(0, 0, 80, 20);
    
    // Add windows
    trainGraphics.fillStyle(0xffff00, 0.8);
    trainGraphics.fillRect(10, 5, 15, 10);
    trainGraphics.fillRect(35, 5, 15, 10);
    trainGraphics.fillRect(55, 5, 15, 10);
    
    const trainTexture = trainGraphics.generateTexture('train', 80, 20);
    trainGraphics.destroy();
    
    this.train.setTexture('train');
    this.train.setVelocityX(-150); // Move left
    this.train.body!.setAllowGravity(false); // Train doesn't fall
    
    // Respawn train every 5 seconds
    this.time.addEvent({
      delay: 5000,
      callback: () => {
        this.train.x = 400;
        this.train.setVelocityX(-150);
      },
      loop: true
    });
  }
  
  private createPlayer() {
    // Create physics sprite for player (invisible)
    this.player = this.physics.add.sprite(50, 150, '');
    this.player.setSize(18, 26);
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
    // Ceci on top platform
    this.ceci = createCeciSprite(this, 280, 30);
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
    // Check if player overlaps with escalator
    const bounds = this.escalator.getBounds();
    const playerBounds = this.player.getBounds();
    
    if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, playerBounds)) {
      if (!this.onEscalator) {
        this.onEscalator = true;
      }
      // Auto-move player up on escalator
      this.player.setVelocityY(-80);
    } else {
      this.onEscalator = false;
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
    this.player.y = 150;
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

