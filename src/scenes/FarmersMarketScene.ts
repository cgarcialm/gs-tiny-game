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
  
  private smushs: Phaser.GameObjects.Container[] = []; // The "ghosts"
  private pies: Phaser.GameObjects.Graphics[] = []; // Collectible pies (dots)
  private piesCollected = 0;
  private totalPies = 0;
  
  private speed = 100;
  private smushSpeed = 80; // Slightly slower than player
  
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
    
    // Create farmers market maze
    this.createMarketMaze();
    
    // Create Grayson (top-down view)
    this.player = createGraysonTopDownSprite(this, 160, 140);
    this.player.setDepth(10);
    
    // Create physics body
    this.playerPhysics = this.physics.add.sprite(160, 140, '');
    this.playerPhysics.setSize(12, 14);
    this.playerPhysics.setAlpha(0);
    
    // Spawn pies to collect
    this.spawnPies();
    
    // Spawn 4 Smushs (the "ghosts")
    this.spawnSmushGhosts();
    
    // Show intro dialogue
    this.time.delayedCall(500, () => {
      this.dialogueManager.show("Grayson: Smush, I said we'd BOTH get treats!\nStop chasing me! Let me collect these first!");
    });
  }

  private createMarketMaze() {
    // Pastel gradient background (inspired by dreamy soap colors)
    const bg = this.add.graphics();
    
    // Create vertical gradient stripes (pastel rainbow)
    const colors = [
      0xc4b5fd, // Soft purple
      0xf0abfc, // Pink
      0xfda4af, // Rose
      0xfed7aa, // Peach
      0xfef08a, // Soft yellow
      0xbef264, // Lime
      0xa7f3d0, // Mint
      0x99f6e4, // Aqua
      0xbfdbfe, // Sky blue
      0xc4b5fd, // Back to purple
    ];
    
    const stripeWidth = 320 / colors.length;
    colors.forEach((color, i) => {
      bg.fillStyle(color, 1);
      bg.fillRect(i * stripeWidth, 0, stripeWidth, 180);
    });
    bg.setDepth(0);
    
    // Market stall "walls" (soft white/cream with pastel borders)
    const walls = this.add.graphics();
    
    // Walls with pastel pink borders
    walls.fillStyle(0xffffff, 0.8); // Semi-transparent white
    walls.lineStyle(2, 0xfda4af, 1); // Pastel pink border
    
    // Outer border
    walls.strokeRect(10, 10, 300, 160);
    
    walls.setDepth(5);
  }

  private spawnPies() {
    // Spawn small pies in grid pattern (like Pac-Man dots)
    const pieColor = 0xff8a80; // Pink/red (strawberry rhubarb)
    
    // Simple grid for now
    for (let x = 40; x < 280; x += 30) {
      for (let y = 40; y < 150; y += 30) {
        const pie = this.add.graphics();
        pie.fillStyle(pieColor, 1);
        pie.fillCircle(x, y, 3); // Small pie dot
        pie.setDepth(3);
        pie.setData('isPie', true);
        this.pies.push(pie);
      }
    }
    
    this.totalPies = this.pies.length;
  }

  private spawnSmushGhosts() {
    // 4 Smushs with different behaviors (like Pac-Man ghosts)
    const spawnPositions = [
      { x: 40, y: 40, behavior: 'chase' },    // Red ghost equivalent
      { x: 280, y: 40, behavior: 'ambush' },  // Pink ghost equivalent  
      { x: 40, y: 140, behavior: 'patrol' },  // Blue ghost equivalent
      { x: 280, y: 140, behavior: 'random' }, // Orange ghost equivalent
    ];
    
    spawnPositions.forEach((spawn, index) => {
      const smush = createSmushSprite(this, spawn.x, spawn.y);
      smush.setDepth(8);
      smush.setData('behavior', spawn.behavior);
      smush.setData('startX', spawn.x);
      smush.setData('startY', spawn.y);
      
      this.smushs.push(smush);
    });
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
    
    // Player movement (Pac-Man style - 4 directions)
    this.handlePlayerMovement();
    
    // Update Smush ghosts
    this.updateSmushGhosts();
    
    // Check pie collection
    this.checkPieCollection();
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
    
    // Sync sprite
    this.player.x = this.playerPhysics.x;
    this.player.y = this.playerPhysics.y;
  }

  private updateSmushGhosts() {
    // TODO: Implement different AI behaviors for each Smush
    this.smushs.forEach(smush => {
      const behavior = smush.getData('behavior');
      
      switch (behavior) {
        case 'chase':
          // Chase player directly
          this.chasePlayer(smush);
          break;
        case 'ambush':
          // Try to get ahead of player
          this.ambushPlayer(smush);
          break;
        case 'patrol':
          // Patrol area
          this.patrolArea(smush);
          break;
        case 'random':
          // Random movement
          this.randomMovement(smush);
          break;
      }
    });
  }

  private chasePlayer(smush: Phaser.GameObjects.Container) {
    // Simple chase AI
    const dx = this.playerPhysics.x - smush.x;
    const dy = this.playerPhysics.y - smush.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      smush.x += (dx / dist) * this.smushSpeed * (this.game.loop.delta / 1000);
      smush.y += (dy / dist) * this.smushSpeed * (this.game.loop.delta / 1000);
    }
  }

  private ambushPlayer(smush: Phaser.GameObjects.Container) {
    // TODO: Try to get ahead of player
    this.chasePlayer(smush); // For now, just chase
  }

  private patrolArea(smush: Phaser.GameObjects.Container) {
    // TODO: Patrol in pattern
    this.chasePlayer(smush); // For now, just chase
  }

  private randomMovement(smush: Phaser.GameObjects.Container) {
    // TODO: Random direction changes
    this.chasePlayer(smush); // For now, just chase
  }

  private checkPieCollection() {
    // Check if player is near any pie
    this.pies.forEach((pie, index) => {
      if (!pie.active) return;
      
      const dist = Phaser.Math.Distance.Between(
        this.playerPhysics.x,
        this.playerPhysics.y,
        pie.x,
        pie.y
      );
      
      if (dist < 10) {
        // Collect pie!
        pie.destroy();
        this.piesCollected++;
        
        // Check if all collected
        if (this.piesCollected >= this.totalPies) {
          this.levelComplete();
        }
      }
    });
  }

  private levelComplete() {
    this.dialogueManager.show("All pies collected! The memory is complete!");
    
    // Spawn memory fragment
    this.time.delayedCall(2000, () => {
      const memory = createCardPieceSprite(this, 160, 90);
      spawnCardPieceSparkles(this, 160, 90);
      
      // Transition back
      this.time.delayedCall(3000, () => {
        this.registry.set('completedLevels', 3);
        fadeToScene(this, "Game", 1000);
      });
    });
  }
}

