import Phaser from "phaser";
import { createGraysonPacManSprite, animateGraysonChomp, createSmushPacManSprite, animateSmushChomp } from "../utils/sprites";
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
  
  private entranceComplete = false; // Don't sync during entrance animation
  
  private pies: Phaser.GameObjects.Graphics[] = []; // Collectible pies
  private graysonPiesEaten = 0;
  private smushPiesEaten = 0;
  private totalDots = 0; // Set after spawning
  private dotsNeeded = 0; // Calculated as percentage
  
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
    
    // Clear any previous dialogue
    this.dialogueManager.hide();
    
    // Disable gravity for top-down view
    this.physics.world.gravity.y = 0;
    
    // Create walls first (for collision)
    this.createWalls();
    
    // Create farmers market maze
    this.createMarketMaze();
    
    // Create Grayson (Pac-Man side view with mouth)
    this.player = createGraysonPacManSprite(this, 160, 220);
    this.player.setDepth(10);
    animateGraysonChomp(this.player, this); // Chomping animation
    
    // Create physics body for Grayson (very small for easier navigation)
    this.playerPhysics = this.physics.add.sprite(160, 220, '');
    this.playerPhysics.setSize(6, 6); // Small hitbox (auto-centered)
    this.playerPhysics.setAlpha(0);
    this.playerPhysics.setCollideWorldBounds(false); // Allow off-screen initially
    
    // Add collision with walls
    this.physics.add.collider(this.playerPhysics, this.walls);
    
    // Create ONE Smush (Pac-Man side view with mouth)
    this.smush = createSmushPacManSprite(this, 160, -30);
    this.smush.setDepth(10);
    animateSmushChomp(this.smush, this); // Chomping animation
    
    // Physics body for Smush (very small for easier navigation)
    this.smushPhysics = this.physics.add.sprite(160, -30, '');
    this.smushPhysics.setSize(6, 6); // Small hitbox (auto-centered)
    this.smushPhysics.setAlpha(0);
    this.smushPhysics.setCollideWorldBounds(false); // Allow off-screen initially
    this.smushPhysics.setGravityY(0); // Explicitly disable gravity
    
    // Smush also collides with walls
    this.physics.add.collider(this.smushPhysics, this.walls);
    
    // Spawn pies randomly
    this.spawnPies();
    
    // Animate entrances through tunnels
    this.time.delayedCall(300, () => {
      let graysonDone = false;
      let smushDone = false;
      
      const checkBothDone = () => {
        if (graysonDone && smushDone) {
          this.entranceComplete = true; // Enable sprite syncing only when BOTH finish
        }
      };
      
      // Grayson walks UP from bottom (through bottom tunnel)
      this.tweens.add({
        targets: [this.player, this.playerPhysics],
        y: 145, // Final position in bottom area of playfield
        duration: 2000,
        ease: "Linear",
        onComplete: () => {
          this.playerPhysics.setCollideWorldBounds(true);
          graysonDone = true;
          checkBothDone();
        }
      });
      
      // Smush walks DOWN from top (through top tunnel)
      this.tweens.add({
        targets: [this.smush, this.smushPhysics],
        y: 35, // Final position in top area of playfield
        duration: 2000,
        ease: "Linear",
        onComplete: () => {
          this.smushPhysics.setCollideWorldBounds(true);
          smushDone = true;
          checkBothDone();
        }
      });
      
      // Show dialogue as they're entering
      this.time.delayedCall(800, () => {
        this.dialogueManager.show("Grayson: Smush! These are MY pies!");
      });
    });
  }

  private createWalls() {
    // Use rectangles with physics enabled - matching NEW visual walls
    this.walls = this.physics.add.staticGroup();
    
    // Helper to create physics rectangle
    const addWall = (x: number, y: number, width: number, height: number) => {
      const wall = this.add.rectangle(x, y, width, height, 0x000000, 0);
      wall.setOrigin(0, 0); // Top-left origin like fillRect
      this.physics.add.existing(wall, true); // true = static
      this.walls.add(wall);
      wall.setAlpha(0); // Invisible
    };
    
    // Outer border walls (with gaps for tunnels)
    addWall(5, 5, 140, 4); // Top left
    addWall(175, 5, 140, 4); // Top right
    addWall(5, 171, 140, 4); // Bottom left
    addWall(175, 171, 140, 4); // Bottom right
    addWall(5, 5, 4, 170); // Left
    addWall(311, 5, 4, 170); // Right
    
    // Pink blocks (4 total)
    addWall(22, 22, 56, 26); // Top-left 1
    addWall(242, 22, 56, 26); // Top-right 1
    addWall(92, 22, 56, 26); // Top-left 2
    addWall(172, 22, 56, 26); // Top-right 2
    
    // Peach side blocks
    addWall(22, 62, 46, 26); // Left
    addWall(252, 62, 46, 26); // Right
    
    // Center mint block
    addWall(112, 62, 98, 56);
    
    // Lavender side blocks
    addWall(22, 102, 46, 56); // Left
    addWall(252, 102, 46, 56); // Right
    
    // Yellow bottom blocks
    addWall(82, 132, 66, 26); // Left
    addWall(172, 132, 66, 26); // Right
    
    // Yellow vertical extensions
    addWall(82, 62, 17, 96); // Left
    addWall(221, 62, 17, 96); // Right
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
    
    // Top row blocks (pastel pink)
    walls.fillStyle(0xfda4af, 1);
    walls.fillRect(22, 22, 56, 26); // Top-left
    walls.fillRect(242, 22, 56, 26); // Top-right 1 (mirrored)

    // Top row blocks (pastel pink)
    walls.fillStyle(0xbfdbfe, 1);
    walls.fillRect(92, 22, 56, 26); // Top-left
    walls.fillRect(172, 22, 56, 26); // Top-right 2 (mirrored)
    
    // Second row side blocks (pastel peach)
    walls.fillStyle(0xfed7aa, 1);
    walls.fillRect(22, 62, 46, 26); // Left
    walls.fillRect(252, 62, 46, 26); // Right (mirrored)
    
    // Center block (pastel mint)
    walls.fillStyle(0xa7f3d0, 1);
    walls.fillRect(112, 62, 98, 56);
    
    // Third row side blocks (pastel lavender)
    walls.fillStyle(0xddd6fe, 1);
    walls.fillRect(22, 102, 46, 56); // Left
    walls.fillRect(252, 102, 46, 56); // Right (mirrored)

    // Bottom row blocks (pastel yellow)
    walls.fillStyle(0xfef08a, 1);
    walls.fillRect(82, 132, 66, 26); // Left
    walls.fillRect(172, 132, 66, 26); // Right (mirrored)

    // Vertical extensions from bottom yellow blocks
    walls.fillRect(82, 62, 17, 96); // Left
    walls.fillRect(221, 62, 17, 96); // Right (mirrored)
    
    walls.setDepth(5);
  }

  private spawnPies() {
    // Full grid - you adjust boundaries and I'll mirror
    const dotColor = 0xfef08a;
    const spacing = 10;
    
    const addDot = (x: number, y: number) => {
      const dot = this.add.graphics();
      dot.fillStyle(dotColor, 0.4);
      dot.fillCircle(0, 0, 3);
      dot.fillStyle(dotColor, 1);
      dot.fillCircle(0, 0, 2);
      dot.setPosition(x, y);
      dot.setDepth(3);
      dot.setData('isPie', true);
      dot.setData('collected', false);
      this.pies.push(dot);
    };
    
    // Dense grid covering entire playfield
    for (let x = 15; x < 310; x += spacing) {
      for (let y = 15; y < 170; y += spacing) {
        addDot(x, y);
      }
    }
    
    this.totalDots = this.pies.length;
    this.dotsNeeded = Math.ceil(this.totalDots * 0.6);
    console.log(`Total dots: ${this.totalDots}, Need ${this.dotsNeeded} to win`);
  }
  
  private isInWall(x: number, y: number): boolean {
    // Check if position overlaps with any wall rectangles
    // Pink blocks
    if ((x >= 30 && x <= 145 && y >= 23 && y <= 53) ||
        (x >= 175 && x <= 290 && y >= 23 && y <= 53)) return true;
    
    // Peach blocks
    if ((x >= 30 && x <= 60 && y >= 70 && y <= 100) ||
        (x >= 260 && x <= 290 && y >= 70 && y <= 100)) return true;
    
    // Center mint block
    if (x >= 115 && x <= 205 && y >= 70 && y <= 111) return true;
    
    // Lavender blocks
    if ((x >= 30 && x <= 60 && y >= 115 && y <= 155) ||
        (x >= 260 && x <= 290 && y >= 115 && y <= 155)) return true;
    
    // Yellow blocks
    if ((x >= 95 && x <= 145 && y >= 130 && y <= 155) ||
        (x >= 175 && x <= 225 && y >= 130 && y <= 155)) return true;
    
    // Yellow extensions
    if ((x >= 80 && x <= 95 && y >= 70 && y <= 155) ||
        (x >= 225 && x <= 240 && y >= 70 && y <= 155)) return true;
    
    return false;
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
    
    // Player movement (only after entrance)
    if (this.entranceComplete) {
      this.handlePlayerMovement();
      
      // Smush AI (competitive - also tries to get pies)
      this.updateSmushAI();
      
      // Check tunnel wrapping (Pac-Man teleport)
      this.checkTunnelWrapping();
      
      // Check pie collection for both
      this.checkPieCollection();
    }
    
    // Sync sprites with physics (only after entrance completes)
    if (this.entranceComplete) {
      this.player.x = this.playerPhysics.x;
      this.player.y = this.playerPhysics.y;
      this.smush.x = this.smushPhysics.x;
      this.smush.y = this.smushPhysics.y;
    }
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
      
      // Flip sprite based on horizontal movement
      if (vx < 0) {
        this.player.setScale(-1, 1); // Moving left - flip
      } else if (vx > 0) {
        this.player.setScale(1, 1); // Moving right - normal
      }
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
      const pieX = (nearestPie as Phaser.GameObjects.Graphics).x;
      const pieY = (nearestPie as Phaser.GameObjects.Graphics).y;
      
      const angle = Phaser.Math.Angle.Between(
        this.smushPhysics.x, this.smushPhysics.y,
        pieX, pieY
      );
      
      const vx = Math.cos(angle) * this.smushSpeed;
      const vy = Math.sin(angle) * this.smushSpeed;
      
      this.smushPhysics.setVelocity(vx, vy);
      
      // Flip Smush sprite based on horizontal movement
      if (vx < 0) {
        this.smush.setScale(-1, 1); // Moving left - flip
      } else if (vx > 0) {
        this.smush.setScale(1, 1); // Moving right - normal
      }
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
        
        console.log(`Grayson: ${this.graysonPiesEaten}/${this.dotsNeeded}`);
        
        if (this.graysonPiesEaten >= this.dotsNeeded) {
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
        pie.setAlpha(0); // Invisible when collected
        pie.destroy(); // Remove completely
        this.smushPiesEaten++;
        
        console.log(`Smush: ${this.smushPiesEaten}/${this.dotsNeeded}`);
        
        if (this.smushPiesEaten >= this.dotsNeeded) {
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
      // Proper restart - stops current scene and starts fresh
      this.scene.stop();
      this.scene.start("FarmersMarket");
    });
  }
}

