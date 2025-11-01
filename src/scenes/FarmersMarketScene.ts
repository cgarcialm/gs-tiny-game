import Phaser from "phaser";
import { createGraysonTopDownSprite } from "../utils/sprites/GraysonTopDownSprite";
import { createSmushSprite } from "../utils/sprites/SmushSprite";
import { createCardPieceSprite, spawnCardPieceSparkles } from "../utils/sprites";
import { initializeGameScene } from "../utils/sceneSetup";
import { fadeToScene } from "../utils/sceneTransitions";
import { shouldCloseDialogue } from "../utils/controls";
import type { GameControls } from "../utils/controls";
import type { DialogueManager } from "../utils/dialogueManager";
import type { HelpMenu } from "../utils/helpMenu";
import type { PauseMenu } from "../utils/pauseMenu";

/**
 * Farmers Market Scene - Pac-Man Style
 * Grayson collects strawberry rhubarb pies while dodging excited Smushs
 */
export default class FarmersMarketScene extends Phaser.Scene {
  private controls!: GameControls;
  private helpMenu!: HelpMenu;
  private pauseMenu!: PauseMenu;
  private dialogueManager!: DialogueManager;
  
  private player!: Phaser.GameObjects.Container;
  private playerPhysics!: Phaser.Physics.Arcade.Sprite;
  
  private smush!: Phaser.GameObjects.Container; // ONE Smush (competitor)
  private smushPhysics!: Phaser.Physics.Arcade.Sprite;
  
  private pies: Phaser.GameObjects.Graphics[] = []; // Collectible pies
  private graysonPiesEaten = 0;
  private smushPiesEaten = 0;
  private piesNeeded = 3; // Each needs 3 to win
  
  private walls!: Phaser.Physics.Arcade.StaticGroup; // Collision walls
  
  private speed = 100;
  private smushSpeed = 95; // Slightly slower but competitive
  
  constructor() {
    super("FarmersMarket");
  }

  create() {
    // Initialize common scene setup
    const setup = initializeGameScene(this);
    this.controls = setup.controls;
    this.helpMenu = setup.helpMenu;
    this.pauseMenu = setup.pauseMenu;
    this.dialogueManager = setup.dialogueManager;
    
    // Disable gravity for top-down view
    this.physics.world.gravity.y = 0;
    
    // Create walls first (for collision)
    this.createWalls();
    
    // Create farmers market maze
    this.createMarketMaze();
    
    // Create Grayson (top-down view)
    this.player = createGraysonTopDownSprite(this, 40, 140);
    this.player.setDepth(10);
    
    // Create physics body for Grayson
    this.playerPhysics = this.physics.add.sprite(40, 140, '');
    this.playerPhysics.setSize(12, 14);
    this.playerPhysics.setAlpha(0);
    this.playerPhysics.setCollideWorldBounds(true);
    
    // Add collision with walls
    this.physics.add.collider(this.playerPhysics, this.walls);
    
    // Create ONE Smush (competitor)
    this.smush = createSmushSprite(this, 280, 40);
    this.smush.setDepth(10);
    
    // Physics body for Smush
    this.smushPhysics = this.physics.add.sprite(280, 40, '');
    this.smushPhysics.setSize(14, 16);
    this.smushPhysics.setAlpha(0);
    this.smushPhysics.setCollideWorldBounds(true);
    
    // Smush also collides with walls
    this.physics.add.collider(this.smushPhysics, this.walls);
    
    // Spawn pies randomly
    this.spawnPies();
    
    // Show intro dialogue
    this.time.delayedCall(500, () => {
      this.dialogueManager.show("Grayson: Smush! These are MY pies!");
    });
  }

  private createWalls() {
    // Create physics wall group (simplified Pac-Man maze)
    this.walls = this.physics.add.staticGroup();
    
    const wallThickness = 8;
    
    // Outer border walls (with gaps for tunnels at center)
    // Top wall - split for tunnel
    this.walls.create(80, 15, '').setSize(140, wallThickness).setVisible(false).refreshBody(); // Top left
    this.walls.create(240, 15, '').setSize(140, wallThickness).setVisible(false).refreshBody(); // Top right
    // Bottom wall - split for tunnel
    this.walls.create(80, 165, '').setSize(140, wallThickness).setVisible(false).refreshBody(); // Bottom left
    this.walls.create(240, 165, '').setSize(140, wallThickness).setVisible(false).refreshBody(); // Bottom right
    // Side walls
    this.walls.create(15, 90, '').setSize(wallThickness, 160).setVisible(false).refreshBody(); // Left
    this.walls.create(305, 90, '').setSize(wallThickness, 160).setVisible(false).refreshBody(); // Right
    
    // Top row blocks
    this.walls.create(60, 45, '').setSize(50, 30).setVisible(false).refreshBody();
    this.walls.create(260, 45, '').setSize(50, 30).setVisible(false).refreshBody();
    
    // Second row - side blocks
    this.walls.create(45, 85, '').setSize(30, 30).setVisible(false).refreshBody();
    this.walls.create(275, 85, '').setSize(30, 30).setVisible(false).refreshBody();
    
    // Center block
    this.walls.create(160, 90, '').setSize(60, 35).setVisible(false).refreshBody();
    
    // Third row - side blocks
    this.walls.create(45, 130, '').setSize(30, 30).setVisible(false).refreshBody();
    this.walls.create(275, 130, '').setSize(30, 30).setVisible(false).refreshBody();
    
    // Bottom row blocks
    this.walls.create(120, 145, '').setSize(50, 25).setVisible(false).refreshBody();
    this.walls.create(200, 145, '').setSize(50, 25).setVisible(false).refreshBody();
  }
  
  private createMarketMaze() {
    // Outer background (soft sky blue - covers full screen)
    const outerBg = this.add.rectangle(160, 90, 320, 180, 0xbfdbfe, 1);
    outerBg.setOrigin(0.5).setDepth(0);
    
    // Inner playfield (black - much bigger)
    const innerBg = this.add.rectangle(160, 90, 310, 170, 0x000000, 1);
    innerBg.setOrigin(0.5).setDepth(1);
    
    // Top entrance tunnel (black extends all the way to screen top)
    const topTunnel = this.add.rectangle(160, 0, 30, 15, 0x000000, 1);
    topTunnel.setOrigin(0.5, 0).setDepth(2);
    
    // Bottom entrance tunnel (black extends all the way to screen bottom)
    const bottomTunnel = this.add.rectangle(160, 180, 30, 15, 0x000000, 1);
    bottomTunnel.setOrigin(0.5, 1).setDepth(2);
    
    // Visual walls matching physics (pastel colored blocks)
    const walls = this.add.graphics();
    
    // Outer border (pastel purple - with gaps for tunnels)
    walls.fillStyle(0xc4b5fd, 1);
    // Top border - split for tunnel
    walls.fillRect(5, 5, 140, 4); // Top left
    walls.fillRect(175, 5, 140, 4); // Top right
    // Bottom border - split for tunnel
    walls.fillRect(5, 171, 140, 4); // Bottom left
    walls.fillRect(175, 171, 140, 4); // Bottom right
    // Side borders
    walls.fillRect(5, 5, 4, 170); // Left
    walls.fillRect(311, 5, 4, 170); // Right
    
    // Top row blocks (pastel pink) - moved up 2px
    walls.fillStyle(0xfda4af, 1);
    walls.fillRect(30, 23, 115, 30); // Top-left
    walls.fillRect(175, 23, 115, 30); // Top-right
    
    // Second row side blocks (pastel peach) - moved up 2px
    walls.fillStyle(0xfed7aa, 1);
    walls.fillRect(30, 70, 30, 30); // Left
    walls.fillRect(260, 70, 30, 30); // Right
    
    // Center block (pastel mint) - moved up 2px
    walls.fillStyle(0xa7f3d0, 1);
    walls.fillRect(115, 70, 90, 41);
    
    // Third row side blocks (pastel lavender) - moved up 2px
    walls.fillStyle(0xddd6fe, 1);
    walls.fillRect(30, 115, 30, 40); // Left
    walls.fillRect(260, 115, 30, 40); // Right
    
    // Bottom row blocks (pastel yellow) - moved up 2px
    walls.fillStyle(0xfef08a, 1);
    walls.fillRect(95, 130, 50, 25); // Bottom-left
    walls.fillRect(175, 130, 50, 25); // Bottom-right
    
    // Vertical extensions from bottom yellow blocks going up - moved up 2px
    walls.fillRect(225, 70, 15, 85); // Right side: narrow vertical
    walls.fillRect(80, 70, 15, 85); // Left side: mirrored
    
    walls.setDepth(5);
  }

  private spawnPies() {
    // Spawn pies at random positions (avoiding walls)
    const pieColors = [
      0xfda4af, // Rose
      0xfed7aa, // Peach  
      0xfbbf24, // Soft gold
    ];
    
    const numPies = 10; // Start with 10 pies
    
    for (let i = 0; i < numPies; i++) {
      // Random position in playable area
      const x = 40 + Math.random() * 240;
      const y = 40 + Math.random() * 120;
      
      const pie = this.add.graphics();
      const color = pieColors[i % pieColors.length];
      
      // Pie with subtle glow
      pie.fillStyle(color, 0.5);
      pie.fillCircle(0, 0, 6); // Glow
      pie.fillStyle(color, 1);
      pie.fillCircle(0, 0, 4); // Pie (larger than Pac-Man dots)
      
      pie.setPosition(x, y);
      pie.setDepth(3);
      pie.setData('isPie', true);
      pie.setData('collected', false);
      this.pies.push(pie);
    }
  }


  update() {
    // Handle menus
    if (this.pauseMenu.isVisible() || this.helpMenu.isVisible()) {
      return;
    }
    
    // Handle dialogue
    if (this.dialogueManager.isVisible()) {
      if (shouldCloseDialogue(this.controls)) {
        this.dialogueManager.hide();
      }
      return;
    }
    
    // Player movement
    this.handlePlayerMovement();
    
    // Smush AI (competitive - also tries to get pies)
    this.updateSmushAI();
    
    // Check tunnel wrapping (Pac-Man teleport)
    this.checkTunnelWrapping();
    
    // Check pie collection for both
    this.checkPieCollection();
    
    // Sync sprites with physics
    this.player.x = this.playerPhysics.x;
    this.player.y = this.playerPhysics.y;
    this.smush.x = this.smushPhysics.x;
    this.smush.y = this.smushPhysics.y;
  }
  
  private checkTunnelWrapping() {
    const tunnelCenterX = 160;
    const tunnelWidth = 15; // Half of 30px tunnel
    
    // Check if in tunnel horizontally
    const inTunnel = Math.abs(this.playerPhysics.x - tunnelCenterX) < tunnelWidth;
    const smushInTunnel = Math.abs(this.smushPhysics.x - tunnelCenterX) < tunnelWidth;
    
    // Grayson: Top tunnel → bottom
    if (inTunnel && this.playerPhysics.y < 10) {
      this.playerPhysics.setPosition(this.playerPhysics.x, 170);
    }
    
    // Grayson: Bottom tunnel → top
    if (inTunnel && this.playerPhysics.y > 170) {
      this.playerPhysics.setPosition(this.playerPhysics.x, 10);
    }
    
    // Smush: Top tunnel → bottom
    if (smushInTunnel && this.smushPhysics.y < 10) {
      this.smushPhysics.setPosition(this.smushPhysics.x, 170);
    }
    
    // Smush: Bottom tunnel → top
    if (smushInTunnel && this.smushPhysics.y > 170) {
      this.smushPhysics.setPosition(this.smushPhysics.x, 10);
    }
  }

  private handlePlayerMovement() {
    const vx = this.controls.left.isDown ? -1 :
               this.controls.right.isDown ? 1 : 0;
    const vy = this.controls.up.isDown ? -1 :
               this.controls.down.isDown ? 1 : 0;
    
    // Normalize diagonal movement
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const len = Math.sqrt(vx * vx + vy * vy);
      this.playerPhysics.setVelocity(
        (vx / len) * this.speed,
        (vy / len) * this.speed
      );
    } else {
      this.playerPhysics.setVelocity(0, 0);
    }
    
  }

  private updateSmushAI() {
    // Smush goes after nearest pie
    let nearestPie: Phaser.GameObjects.Graphics | null = null;
    let nearestDist = Infinity;
    
    this.pies.forEach(pie => {
      if (pie.getData('collected')) return;
      
      const dist = Phaser.Math.Distance.Between(
        this.smushPhysics.x, this.smushPhysics.y,
        pie.x, pie.y
      );
      
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPie = pie;
      }
    });
    
    // Move toward nearest pie
    if (nearestPie) {
      const angle = Phaser.Math.Angle.Between(
        this.smushPhysics.x, this.smushPhysics.y,
        nearestPie.x, nearestPie.y
      );
      
      this.smushPhysics.setVelocity(
        Math.cos(angle) * this.smushSpeed,
        Math.sin(angle) * this.smushSpeed
      );
    } else {
      this.smushPhysics.setVelocity(0, 0);
    }
  }

  private checkPieCollection() {
    // Check both Grayson and Smush for pie collection
    this.pies.forEach((pie) => {
      if (pie.getData('collected')) return;
      
      // Check Grayson
      const distGrayson = Phaser.Math.Distance.Between(
        this.playerPhysics.x, this.playerPhysics.y,
        pie.x, pie.y
      );
      
      if (distGrayson < 12) {
        pie.setData('collected', true);
        pie.setAlpha(0.3); // Fade but don't destroy yet
        this.graysonPiesEaten++;
        
        console.log(`Grayson: ${this.graysonPiesEaten}/${this.piesNeeded}`);
        
        if (this.graysonPiesEaten >= this.piesNeeded) {
          this.graysonWins();
        }
        return;
      }
      
      // Check Smush
      const distSmush = Phaser.Math.Distance.Between(
        this.smushPhysics.x, this.smushPhysics.y,
        pie.x, pie.y
      );
      
      if (distSmush < 12) {
        pie.setData('collected', true);
        pie.setAlpha(0.3); // Fade
        this.smushPiesEaten++;
        
        console.log(`Smush: ${this.smushPiesEaten}/${this.piesNeeded}`);
        
        if (this.smushPiesEaten >= this.piesNeeded) {
          this.smushWins();
        }
        return;
      }
    });
  }

  private graysonWins() {
    this.dialogueManager.show("Grayson: Got my pies! The memory is coming back...");
    
    // Spawn memory fragment
    this.time.delayedCall(2000, () => {
      const memory = createCardPieceSprite(this, 160, 90);
      memory.setDepth(20);
      spawnCardPieceSparkles(this, 160, 90);
      
      // Transition back
      this.time.delayedCall(3000, () => {
        this.registry.set('completedLevels', 3);
        fadeToScene(this, "Game", 1000);
      });
    });
  }
  
  private smushWins() {
    this.dialogueManager.show("Smush: *Meow meow!* (I win!)\nGrayson: Okay okay, let's try again...");
    
    this.time.delayedCall(3000, () => {
      this.scene.restart();
    });
  }
}

