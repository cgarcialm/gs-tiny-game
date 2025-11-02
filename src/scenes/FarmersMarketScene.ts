import Phaser from "phaser";
import { createGraysonPacManSprite, animateGraysonChomp, createSmushPacManSprite, animateSmushChomp, createPieSliceSprite, createShopperSprite } from "../utils/sprites";
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
  private smushTargetChangeTimer = 0;
  private smushCurrentTarget: Phaser.GameObjects.Graphics | null = null;
  
  private entranceComplete = false; // Don't sync during entrance animation
  
  private pies: Phaser.GameObjects.Graphics[] = []; // Collectible dots and pies
  private graysonDotsEaten = 0;
  private smushDotsEaten = 0;
  private graysonPiesEaten = 0; // Track pie slices separately
  private totalDots = 0;
  private dotsNeeded = 0;
  private piesNeeded = 3; // Grayson must eat 3 pie slices to win
  
  private fruits: Phaser.GameObjects.Graphics[] = []; // Power-up fruits
  private fruitSpawnTimer = 0;
  private fruitSpawnInterval = 10000; // Spawn fruit every 10 seconds
  private validDotPositions: {x: number, y: number}[] = []; // Track corridor positions
  
  // Shoppers that block aisles
  private shoppers: { sprite: Phaser.GameObjects.Container, physics: Phaser.Physics.Arcade.Sprite, targetX: number, targetY: number, returning: boolean }[] = [];
  private shopperSpawnTimer = 0;
  private shopperSpawnInterval = 5000; // Spawn shoppers every 5 seconds
  
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  
  private baseSpeed = 100;
  private speed = 100; // Can be boosted by fruits
  private smushSpeed = 110; // Faster than Grayson!
  
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
    
    // Reset all game state
    this.entranceComplete = false;
    this.graysonDotsEaten = 0;
    this.smushDotsEaten = 0;
    this.graysonPiesEaten = 0;
    this.fruitSpawnTimer = 0;
    this.smushTargetChangeTimer = 0;
    this.smushCurrentTarget = null;
    this.pies = [];
    this.fruits = [];
    this.validDotPositions = [];
    this.shoppers = [];
    this.shopperSpawnTimer = 0;
    this.speed = this.baseSpeed;
    
    // Disable gravity for top-down view
    this.physics.world.gravity.y = 0;
    
    // Create walls first (for collision)
    this.createWalls();
    
    // Create farmers market maze
    this.createMarketMaze();
    
    // Create Grayson (Pac-Man side view with mouth)
    this.player = createGraysonPacManSprite(this, 160, 220);
    this.player.setDepth(10);
    this.player.setData('glowSize', 8); // Start with default glow
    this.player.setData('glowOpacity', 0.6); // Default opacity
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
    this.smush.setData('glowSize', 8); // Start with default glow
    this.smush.setData('glowOpacity', 0.6); // Default opacity
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
    
    // Center mint block (perfectly centered)
    addWall(111, 62, 98, 56);
    
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

    // -------------------------- Maze --------------------------
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
    
    // Center block (pastel mint - perfectly centered)
    walls.fillStyle(0xa7f3d0, 1);
    walls.fillRect(111, 62, 98, 56);
    
    // -------------------------- Water tower --------------------------

    const tower = this.add.graphics();
    const towerX = 160; // Screen center
    const towerY = 82; // Moved up a bit
    
    // 4 Diagonal legs (dark, opening downward)
    tower.lineStyle(2, 0x333333, 1);
    const legLength = 15;
    
    // Front-left leg
    tower.lineBetween(towerX - 6, towerY, towerX - 12, towerY + legLength);
    // Front-right leg
    tower.lineBetween(towerX + 6, towerY, towerX + 12, towerY + legLength);
    // Back-left leg (slightly inward for depth)
    tower.lineBetween(towerX - 2, towerY, towerX - 8, towerY + legLength);
    // Back-right leg (slightly inward for depth)
    tower.lineBetween(towerX + 2, towerY, towerX + 8, towerY + legLength);
    
    // Tank (darker gray sphere)
    tower.fillStyle(0xb0b0b0, 1); // Darker gray
    tower.fillCircle(towerX, towerY, 8);
    
    // Cylinder body
    tower.fillRect(towerX - 8, towerY - 8, 16, 8);
    
    // Text on tank (simplified "CAMP")
    this.add.text(towerX, towerY - 2, "CAMP", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: "#333333",
      fontStyle: "bold",
      resolution: 2,
    }).setOrigin(0.5).setDepth(7);
    
    // Dark horizontal line at bottom of tank (cylinder edge)
    tower.lineStyle(1.5, 0x444444, 1); // Darker
    tower.beginPath();
    tower.arc(towerX, towerY - 23, 27, Phaser.Math.DegToRad(70), Phaser.Math.DegToRad(110), false);
    tower.strokePath();
    
    // Top cone/roof
    tower.fillStyle(0x808080, 1); // Darker gray
    tower.beginPath();
    tower.moveTo(towerX - 9, towerY - 8);
    tower.lineTo(towerX + 9, towerY - 8);
    tower.lineTo(towerX, towerY - 13);
    tower.closePath();
    tower.fill();
    
    // Small antenna on top
    tower.fillStyle(0x555555, 1); // Darker
    tower.fillCircle(towerX, towerY - 13, 1);
    
    tower.setDepth(6); // Above mint block
    
    // "Farmers Market" text below tower
    this.add.text(towerX, towerY + 26, "FARMERS MARKET", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#7c3aed", // Darker purple for visibility
      fontStyle: "bold",
      resolution: 2,
    }).setOrigin(0.5).setDepth(7);
    
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
    // Full grid - white dots for classic Pac-Man look
    const dotColor = 0xffffff; // White
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
    
    // Pie corner positions (skip dots here)
    const piePositions = [
      { x: 15, y: 15 },   // Top-left corner
      { x: 305, y: 15 },  // Top-right corner
      { x: 15, y: 165 },  // Bottom-left corner
      { x: 305, y: 165 }, // Bottom-right corner
    ];
    
    // Helper to check if position is under a wall block
    const isUnderWall = (x: number, y: number): boolean => {
      // Check all wall rectangles
      if ((x >= 22 && x <= 78 && y >= 22 && y <= 48) ||  // Pink 1 left
          (x >= 242 && x <= 298 && y >= 22 && y <= 48)) return true; // Pink 1 right
      if ((x >= 92 && x <= 148 && y >= 22 && y <= 48) ||  // Pink 2 left
          (x >= 172 && x <= 228 && y >= 22 && y <= 48)) return true; // Pink 2 right
      if ((x >= 22 && x <= 68 && y >= 62 && y <= 88) ||   // Peach left
          (x >= 252 && x <= 298 && y >= 62 && y <= 88)) return true; // Peach right
      if (x >= 111 && x <= 209 && y >= 62 && y <= 118) return true; // Center mint
      if ((x >= 22 && x <= 68 && y >= 102 && y <= 158) || // Lavender left
          (x >= 252 && x <= 298 && y >= 102 && y <= 158)) return true; // Lavender right
      if ((x >= 82 && x <= 148 && y >= 132 && y <= 158) || // Yellow left
          (x >= 172 && x <= 238 && y >= 132 && y <= 158)) return true; // Yellow right
      if ((x >= 82 && x <= 99 && y >= 62 && y <= 158) ||  // Yellow ext left
          (x >= 221 && x <= 238 && y >= 62 && y <= 158)) return true; // Yellow ext right
      return false;
    };
    
    // Dense grid covering entire playfield (skip pie positions and walls)
    for (let x = 15; x < 310; x += spacing) {
      for (let y = 15; y < 170; y += spacing) {
        // Skip if this is a pie position
        const isPiePos = piePositions.some(p => p.x === x && p.y === y);
        if (isPiePos) continue;
        
        // Skip if under wall
        if (isUnderWall(x, y)) {
          addDot(x, y); // Still draw dot (will be hidden by wall)
          continue; // But don't save as valid position
        }
        
        addDot(x, y);
        // Save position as valid corridor location (not under walls!)
        this.validDotPositions.push({ x, y });
      }
    }
    
    // Add actual pie slices in the 4 corners
    
    piePositions.forEach(pos => {
      const pie = createPieSliceSprite(this, pos.x, pos.y);
      pie.setDepth(3);
      pie.setData('isPie', true);
      pie.setData('isPieSlice', true); // Mark as actual pie (worth more?)
      pie.setData('collected', false);
      this.pies.push(pie);
    });
    
    this.totalDots = this.pies.length;
    this.dotsNeeded = Math.ceil(this.totalDots * 0.6);
    console.log(`Total dots: ${this.totalDots}, Need ${this.dotsNeeded} to win`);
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
      
      // Fruit spawning timer
      this.fruitSpawnTimer += this.game.loop.delta;
      if (this.fruitSpawnTimer >= this.fruitSpawnInterval) {
        this.fruitSpawnTimer = 0;
        this.spawnFruit();
      }
      
      // Check fruit collection
      this.checkFruitCollection();
      
      // Shopper spawning timer
      this.shopperSpawnTimer += this.game.loop.delta;
      if (this.shopperSpawnTimer >= this.shopperSpawnInterval && this.shoppers.length < 2) {
        this.shopperSpawnTimer = 0;
        this.spawnShopper();
      }
      
      // Update shoppers
      this.updateShoppers();
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
    // Change target every 3 seconds or when stuck
    this.smushTargetChangeTimer += this.game.loop.delta;
    
    const availableDots = this.pies.filter(p => 
      !p.getData('collected') && p.alpha > 0.5
    );
    
    // Pick new random target periodically or if current is collected
    if (!this.smushCurrentTarget || 
        this.smushCurrentTarget.getData('collected') ||
        this.smushTargetChangeTimer > 3000) {
      
      this.smushTargetChangeTimer = 0;
      
      // Prioritize pie slices (80% chance if available)
      const pieSlices = availableDots.filter(p => p.getData('isPieSlice'));
      
      if (pieSlices.length > 0 && Math.random() < 0.8) {
        // Find closest pie slice
        let closestPie: Phaser.GameObjects.Graphics | null = null;
        let closestDist = Infinity;
        
        pieSlices.forEach(pie => {
          const dist = Phaser.Math.Distance.Between(
            this.smushPhysics.x, this.smushPhysics.y,
            pie.x, pie.y
          );
          if (dist < closestDist) {
            closestDist = dist;
            closestPie = pie;
          }
        });
        
        this.smushCurrentTarget = closestPie;
      } else if (availableDots.length > 0) {
        // Pick random regular dot
        this.smushCurrentTarget = availableDots[Math.floor(Math.random() * availableDots.length)];
      }
    }
    
    const nearestPie = this.smushCurrentTarget;
    
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
        pie.destroy(); // Disappear like Smush's
        
        // Check if it's a pie slice or just a dot
        if (pie.getData('isPieSlice')) {
          this.graysonPiesEaten++;
          console.log(`Grayson pies: ${this.graysonPiesEaten}/${this.piesNeeded}`);
        } else {
          this.graysonDotsEaten++;
        }
        
        // Win condition: enough dots AND 3 pies
        if (this.graysonDotsEaten >= this.dotsNeeded && this.graysonPiesEaten >= this.piesNeeded) {
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
        pie.destroy();
        this.smushDotsEaten++;
        
        // Smush can still win by eating enough dots
        if (this.smushDotsEaten >= this.dotsNeeded) {
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
  
  private spawnFruit() {
    // Random fruit type
    const fruitTypes = [
      { name: 'plum', color: 0x8b4789 },    // Purple
      { name: 'peach', color: 0xffcba4 },   // Peachy orange
      { name: 'apple', color: 0xff0000 },   // Red
      { name: 'banana', color: 0xffeb3b }   // Yellow
    ];
    
    const fruitType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    
    // Pick random valid corridor position (from dot grid)
    if (this.validDotPositions.length === 0) return; // No valid positions
    const randomPos = this.validDotPositions[Math.floor(Math.random() * this.validDotPositions.length)];
    const x = randomPos.x;
    const y = randomPos.y;
    
    const fruit = this.add.graphics();
    
    // Simple circle fruit (color-coded)
    fruit.fillStyle(fruitType.color, 1);
    fruit.fillCircle(0, 0, 4);
    
    // Small shine/highlight
    fruit.fillStyle(0xffffff, 0.5);
    fruit.fillCircle(-1, -1, 2);
    
    fruit.setPosition(x, y);
    fruit.setDepth(4);
    fruit.setData('isFruit', true);
    fruit.setData('fruitType', fruitType.name);
    
    // Pulse animation
    this.tweens.add({
      targets: fruit,
      scale: 1.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    
    this.fruits.push(fruit);
    
    // Auto-despawn after 10 seconds
    this.time.delayedCall(10000, () => {
      if (fruit.active) {
        fruit.destroy();
        const index = this.fruits.indexOf(fruit);
        if (index > -1) this.fruits.splice(index, 1);
      }
    });
  }
  
  private checkFruitCollection() {
    this.fruits.forEach(fruit => {
      const dist = Phaser.Math.Distance.Between(
        this.playerPhysics.x, this.playerPhysics.y,
        fruit.x, fruit.y
      );
      
      if (dist < 12) {
        // Collect fruit - speed boost!
        fruit.destroy();
        const index = this.fruits.indexOf(fruit);
        if (index > -1) this.fruits.splice(index, 1);
        
        // Speed boost
        this.speed = 150; // Much faster!
        
        // Store glow values for pulsing
        const glowData = { size: 8, opacity: 0.8 };
        
        // Set initial boosted opacity
        this.player.setData('glowOpacity', 0.8);
        
        // Pulsing glow animation
        const glowTween = this.tweens.add({
          targets: glowData,
          size: 12,
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          onUpdate: () => {
            this.player.setData('glowSize', glowData.size);
          }
        });
        
        // Reset after 5 seconds
        this.time.delayedCall(5000, () => {
          glowTween.stop();
          this.speed = this.baseSpeed;
          this.player.setData('glowSize', 8); // Back to default
          this.player.setData('glowOpacity', 0.6); // Back to normal opacity
        });
      }
    });
  }
  
  private spawnShopper() {
    // Predefined walking lanes in clear corridors (verified safe paths)
    const lanes = [
      { y: 56, xStart: 80, xEnd: 240 },  // Between pink and peach/mint
      { y: 165, xStart: 80, xEnd: 240 }, // Bottom corridor
    ];
    
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const colorIndex = Math.floor(Math.random() * 3);
    
    // Random start from left or right
    const startLeft = Math.random() < 0.5;
    const startX = startLeft ? lane.xStart : lane.xEnd;
    
    // Create shopper sprite
    const shopper = createShopperSprite(this, startX, lane.y, colorIndex);
    shopper.setDepth(5);
    
    // Create physics body
    const shopperPhysics = this.physics.add.sprite(startX, lane.y, '');
    shopperPhysics.setSize(6, 10);
    shopperPhysics.setAlpha(0);
    shopperPhysics.setImmovable(true);
    
    // Add collision with Grayson (blocks him)
    this.physics.add.collider(this.playerPhysics, shopperPhysics);
    
    this.shoppers.push({
      sprite: shopper,
      physics: shopperPhysics,
      targetX: startLeft ? lane.xEnd : lane.xStart,
      targetY: lane.y,
      returning: false
    });
  }
  
  private updateShoppers() {
    const shopperSpeed = 30; // Slow walking speed
    
    this.shoppers.forEach((shopper, index) => {
      const distX = Math.abs(shopper.physics.x - shopper.targetX);
      const distY = Math.abs(shopper.physics.y - shopper.targetY);
      
      if (!shopper.returning) {
        // Walking toward target
        if (distX > 2 || distY > 2) {
          // Move in the direction with largest distance
          if (distX > distY) {
            const direction = shopper.targetX > shopper.physics.x ? 1 : -1;
            shopper.physics.setVelocityX(direction * shopperSpeed);
            shopper.physics.setVelocityY(0);
            
            // Flip sprite based on direction
            shopper.sprite.setScale(direction, 1);
          } else {
            const direction = shopper.targetY > shopper.physics.y ? 1 : -1;
            shopper.physics.setVelocityX(0);
            shopper.physics.setVelocityY(direction * shopperSpeed);
          }
        } else {
          // Reached target, disappear
          shopper.sprite.destroy();
          shopper.physics.destroy();
          this.shoppers.splice(index, 1);
        }
      }
      
      // Sync sprite with physics
      shopper.sprite.x = shopper.physics.x;
      shopper.sprite.y = shopper.physics.y;
    });
  }
}


