import Phaser from "phaser";
import { createGraysonPacManSprite, animateGraysonChomp, createSmushPacManSprite, animateSmushChomp, createPieSliceSprite, createShopperSprite, updateShopperWalk } from "../utils/sprites";
import { createCardPieceSprite, spawnCardPieceSparkles } from "../utils/sprites";
import { initializeGameScene } from "../utils/sceneSetup";
import { fadeToScene } from "../utils/sceneTransitions";
import { handleMenuInput } from "../utils/menuHandler";
import { shouldCloseDialogue } from "../utils/controls";
import type { GameControls } from "../utils/controls";
import type { DialogueManager } from "../utils/dialogueManager";
import type { HelpMenu } from "../utils/helpMenu";
import type { PauseMenu } from "../utils/pauseMenu";
import { checkProximity } from "../utils/collectionHelpers";
import { GameStateManager } from "../managers/GameStateManager";
import { SCENES, VOID_LEVELS } from "../config/sceneConstants";
import { HELP_HINT_X, HELP_HINT_Y } from "../utils/controls";
import { HELP_HINT_TEXT_STYLE } from "../config/textStyles";
import { DEBUG_SHOW_SMUSH_AI } from "../config/debug";

/**
 * Farmers Market Scene - Pac-Man Style
 * Grayson collects strawberry rhubarb pies while dodging excited Smushs
 */
export default class FarmersMarketScene extends Phaser.Scene {
  private gameState!: GameStateManager;
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
  private smushRecentTargets: Phaser.GameObjects.Graphics[] = []; // Remember last 3 targets to avoid
  private smushWanderMode = false; // True when wandering randomly
  private smushWanderTimer = 0; // How long to wander
  private smushBlockedFrames = 0; // Count consecutive frames being blocked
  private debugLine?: Phaser.GameObjects.Graphics; // Visual debug line
  
  private entranceComplete = false; // Don't sync during entrance animation
  private tutorialOverlay: Phaser.GameObjects.Container | null = null;
  private showingTutorial = false;
  private tutorialShown = false; // Track if tutorial was already shown
  
  private cardPiece: Phaser.GameObjects.Graphics | null = null;
  private hasWonConditions = false; // Met win conditions, waiting for card
  private smushWon = false; // Smush won - freeze everything until restart
  
  private pies: Phaser.GameObjects.Graphics[] = []; // Collectible dots and pies
  private graysonDotsEaten = 0;
  private smushDotsEaten = 0;
  private graysonPiesEaten = 0; // Track pie slices separately
  private smushPiesEaten = 0; // Track Smush's pies too
  private totalDots = 0;
  private dotsNeeded = 0;
  private piesNeeded = 3; // Grayson must eat 3 pie slices to win
  private totalPiesSpawned = 0; // Track total pies spawned (max 5)
  private maxPiesToSpawn = 5;
  
  private fruits: Phaser.GameObjects.Graphics[] = []; // Power-up fruits
  private fruitSpawnTimer = 0;
  private fruitSpawnInterval = 10000; // Spawn fruit every 7 seconds
  private firstFruitSpawned = false; // Track if we spawned the first fruit immediately
  private validDotPositions: {x: number, y: number}[] = []; // Track corridor positions
  
  // Wine glasses - hazard that reverses controls
  private wineGlasses: Phaser.GameObjects.Graphics[] = [];
  private wineSpawnTimer = 0;
  private wineSpawnInterval = 5000; // Spawn wine every 2 seconds (very frequent!)
  private firstWineSpawned = false;
  private controlsReversed = false;
  private drunkTimer = 0;
  private drunkDuration = 5000; // 5 seconds of reversed controls
  
  // Shoppers that block aisles
  private shoppers: { sprite: Phaser.GameObjects.Container, physics: Phaser.Physics.Arcade.Sprite, targetX: number, targetY: number, returning: boolean }[] = [];
  private shopperSpawnTimer = 0;
  private shopperSpawnInterval = 3000; // Spawn shoppers every 3 seconds
  
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  
  private baseSpeed = 100;
  private speed = 100; // Can be boosted by fruits
  private smushSpeed = 200; // Much faster than Grayson to reach targets quickly!
  
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
    this.gameState = setup.gameState;
    
    // Clear any previous dialogue
    this.dialogueManager.hide();
    
    // Reset all game state
    this.entranceComplete = false;
    this.showingTutorial = false;
    this.tutorialOverlay = null;
    this.tutorialShown = false;
    this.cardPiece = null;
    this.hasWonConditions = false;
    this.smushWon = false;
    this.graysonDotsEaten = 0;
    this.smushDotsEaten = 0;
    this.graysonPiesEaten = 0;
    this.smushPiesEaten = 0;
    this.totalPiesSpawned = 0;
    this.fruitSpawnTimer = 0;
    this.firstFruitSpawned = false;
    this.smushTargetChangeTimer = 0;
    this.smushCurrentTarget = null;
    this.smushRecentTargets = [];
    this.smushWanderMode = false;
    this.smushWanderTimer = 0;
    this.smushBlockedFrames = 0;
    this.pies = [];
    this.fruits = [];
    this.wineGlasses = [];
    this.wineSpawnTimer = 0;
    this.firstWineSpawned = false;
    this.controlsReversed = false;
    this.drunkTimer = 0;
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
    
    // Create scoreboard
    this.createScoreboard();
    
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
    
    // Physics body for Smush (tiny for easier navigation through maze)
    this.smushPhysics = this.physics.add.sprite(160, -30, '');
    this.smushPhysics.setSize(4, 4); // Tiny hitbox for better wall navigation
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
        y: 162, // Final position in bottom area of playfield
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
    
    // Help hint (bottom-right corner with background)
    this.add.text(HELP_HINT_X, HELP_HINT_Y, "H for Help", HELP_HINT_TEXT_STYLE)
      .setOrigin(1, 1)
      .setDepth(100);
  }

  private createWalls() {
    // Use rectangles with physics enabled - matching NEW visual walls
    this.walls = this.physics.add.staticGroup();
    
    // Helper to create physics rectangle
    const addWall = (x: number, y: number, width: number, height: number, skipInset: boolean = false) => {
      // Make physics box 2px smaller on each side for easier navigation (unless skipInset)
      const inset = skipInset ? 0 : 1;
      const wall = this.add.rectangle(
        x + inset, 
        y + inset, 
        width - inset * 2, 
        height - inset * 2, 
        0x000000, 0 // Invisible
      );
      wall.setOrigin(0, 0); // Top-left origin like fillRect
      this.physics.add.existing(wall, true); // true = static
      this.walls.add(wall);
      wall.setAlpha(0); // Invisible
    };
    
    // Scoreboard barrier (blocks top area) - no inset to avoid gaps
    addWall(0, 0, 320, 20, true);
    
    // Outer border walls (with gaps only for top/bottom tunnels) - no inset (too thin!)
    addWall(5, 24, 143, 4, true); // Top left
    addWall(172, 24, 143, 4, true); // Top right
    addWall(5, 171, 143, 4, true); // Bottom left
    addWall(172, 171, 143, 4, true); // Bottom right
    // Side walls (solid) - no inset (too thin!)
    addWall(5, 25, 4, 150, true); // Left
    addWall(311, 25, 4, 150, true); // Right
    
    // Pink/Blue blocks - moved down and shorter
    addWall(22, 42, 56, 16); // Top-left 1 (pink)
    addWall(242, 42, 56, 16); // Top-right 1 (pink)
    addWall(92, 42, 56, 16); // Top-left 2 (blue)
    addWall(172, 42, 56, 16); // Top-right 2 (blue)
    
    // Peach side blocks - moved down
    addWall(22, 72, 46, 26); // Left
    addWall(252, 72, 46, 26); // Right
    
    // Center mint block - moved down
    addWall(111, 72, 98, 56);
    
    // Lavender side blocks - moved down and shorter
    addWall(22, 111, 46, 47); // Left
    addWall(252, 111, 46, 47); // Right
    
    // Yellow bottom blocks - moved down and shorter
    addWall(82, 142, 66, 16); // Left
    addWall(172, 142, 66, 16); // Right
    
    // Yellow vertical extensions - narrower for wider paths
    addWall(82, 72, 16, 86); // Left (narrower)
    addWall(222, 72, 16, 86); // Right (narrower)
  }
  
  private createScoreboard() {
    // Black bar across top (20px tall)
    const bg = this.add.rectangle(160, 10, 320, 20, 0x000000, 1);
    bg.setOrigin(0.5).setDepth(100);
    
    // Grayson's section (left side)
    const graysonContainer = this.add.container(10, 10);
    graysonContainer.setDepth(101).setName('graysonScoreContainer');
    
    // Smush's section (right side - start from further left)
    const smushContainer = this.add.container(245, 10);
    smushContainer.setDepth(101).setName('smushScoreContainer');
    
    this.updateScoreboard();
  }
  
  private updateScoreboard() {
    const graysonContainer = this.children.getByName('graysonScoreContainer') as Phaser.GameObjects.Container;
    const smushContainer = this.children.getByName('smushScoreContainer') as Phaser.GameObjects.Container;
    
    if (graysonContainer) {
      graysonContainer.removeAll(true);
      
      let xPos = 0;
      
      // "G:" label
      const gLabel = this.add.text(xPos, 0, "G:", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#81c784",
      }).setOrigin(0, 0.5);
      graysonContainer.add(gLabel);
      xPos += 22;
      
      // Pie count (right-aligned so it grows leftward)
      const pieText = this.add.text(xPos, 0, `${this.graysonPiesEaten}`, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#81c784",
      }).setOrigin(1, 0.5);
      graysonContainer.add(pieText);
      xPos += 8;
      
      // Pie sprite (bigger)
      const pieIcon = createPieSliceSprite(this, xPos, 0);
      pieIcon.setScale(1.2);
      graysonContainer.add(pieIcon);
      xPos += 25;
      
      // Dots count (right-aligned so it grows leftward)
      const dotsText = this.add.text(xPos, 0, `${this.graysonDotsEaten}`, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#81c784",
      }).setOrigin(1, 0.5);
      graysonContainer.add(dotsText);
      xPos += 2;
      
      // Dot sprite (bigger)
      const dotIcon = this.add.graphics();
      dotIcon.fillStyle(0xffffff, 1);
      dotIcon.fillCircle(xPos + 3, 0, 3);
      graysonContainer.add(dotIcon);
    }
    
    if (smushContainer) {
      smushContainer.removeAll(true);
      
      let xPos = 0;
      
      // "S:" label
      const sLabel = this.add.text(xPos, 0, "S:", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#d97c3c",
      }).setOrigin(0, 0.5);
      smushContainer.add(sLabel);
      xPos += 22;
      
      // Pie count (right-aligned so it grows leftward)
      const pieText = this.add.text(xPos, 0, `${this.smushPiesEaten}`, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#d97c3c",
      }).setOrigin(1, 0.5);
      smushContainer.add(pieText);
      xPos += 8;
      
      // Pie sprite
      const pieIcon = createPieSliceSprite(this, xPos, 0);
      pieIcon.setScale(1.2);
      smushContainer.add(pieIcon);
      xPos += 28;
      
      // Dots count (right-aligned so it grows leftward)
      const dotsText = this.add.text(xPos, 0, `${this.smushDotsEaten}`, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#d97c3c",
      }).setOrigin(1, 0.5);
      smushContainer.add(dotsText);
      xPos += 2;
      
      // Dot sprite
      const dotIcon = this.add.graphics();
      dotIcon.fillStyle(0xffffff, 1);
      dotIcon.fillCircle(xPos + 3, 0, 3);
      smushContainer.add(dotIcon);
    }
  }

  private createMarketMaze() {

    // -------------------------- Maze --------------------------
    // Outer background (soft sky blue - starts below scoreboard, above lavender border)
    const outerBg = this.add.rectangle(160, 100, 320, 160, 0xbfdbfe, 1);
    outerBg.setOrigin(0.5).setDepth(0);
    
    // Inner playfield (black - much bigger)
    const innerBg = this.add.rectangle(160, 100, 310, 150, 0x000000, 1);
    innerBg.setOrigin(0.5).setDepth(1);
    
    // Top entrance tunnel (width matches gap between blocks: 148 to 172 = 24px)
    const topTunnel = this.add.rectangle(160, 20, 24, 10, 0x000000, 1);
    topTunnel.setOrigin(0.5, 0).setDepth(2);
    
    // Bottom entrance tunnel (width matches gap between blocks)
    const bottomTunnel = this.add.rectangle(160, 180, 24, 15, 0x000000, 1);
    bottomTunnel.setOrigin(0.5, 1).setDepth(2);
    
    // Visual walls matching physics (pastel colored blocks)
    const walls = this.add.graphics();
    
    // Outer border (pastel purple - with gaps for tunnels)
    walls.fillStyle(0xc4b5fd, 1);
    // Top border - split for tunnel (24px gap: 148 to 172)
    walls.fillRect(5, 24, 143, 4); // Top left
    walls.fillRect(172, 24, 143, 4); // Top right
    // Bottom border - split for tunnel (24px gap: 148 to 172)
    walls.fillRect(5, 171, 143, 4); // Bottom left
    walls.fillRect(172, 171, 143, 4); // Bottom right
    // Side borders (solid - no gaps)
    walls.fillRect(5, 25, 4, 150); // Left
    walls.fillRect(311, 25, 4, 150); // Right
    
    // Top row blocks (pastel pink) - shorter
    walls.fillStyle(0xfda4af, 1);
    walls.fillRect(22, 42, 56, 16); // Top-left (shorter)
    walls.fillRect(242, 42, 56, 16); // Top-right 1 (mirrored)

    // Top row blocks (pastel blue) - shorter
    walls.fillStyle(0xbfdbfe, 1);
    walls.fillRect(92, 42, 56, 16); // Top-left (shorter)
    walls.fillRect(172, 42, 56, 16); // Top-right 2 (mirrored)
    
    // Second row side blocks (pastel peach)
    walls.fillStyle(0xfed7aa, 1);
    walls.fillRect(22, 72, 46, 26); // Left
    walls.fillRect(252, 72, 46, 26); // Right (mirrored)
    
    // Center block (pastel mint - perfectly centered)
    walls.fillStyle(0xa7f3d0, 1);
    walls.fillRect(112, 72, 96, 56);

    // Third row side blocks (pastel lavender) - shorter
    walls.fillStyle(0xddd6fe, 1);
    walls.fillRect(22, 111, 46, 47); // Left (shorter)
    walls.fillRect(252, 111, 46, 47); // Right (mirrored)

    // Bottom row blocks (pastel yellow) - shorter
    walls.fillStyle(0xfef08a, 1);
    walls.fillRect(82, 142, 66, 16); // Left (shorter)
    walls.fillRect(172, 142, 66, 16); // Right (mirrored)

    // Vertical extensions from bottom yellow blocks (narrower for wider paths)
    walls.fillRect(82, 72, 16, 86); // Left (narrower: 17 → 13)
    walls.fillRect(222, 72, 16, 86); // Right (narrower)
    
    // -------------------------- Water tower --------------------------

    const tower = this.add.graphics();
    const towerX = 160; // Screen center
    const towerY = 92; // Center of moved mint block (72 + 56/2)
    
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
      dot.setDepth(3); // Below sprites but above floor
      dot.setData('isPie', true);
      dot.setData('collected', false);
      this.pies.push(dot);
    };
    
    // Pie corner positions (skip dots here)
    // Temporary pie positions (will be replaced with random later)
    const piePositions: { x: number, y: number }[] = [];
    
    // Helper to check if position is under or too close to a wall block
    const isUnderWall = (x: number, y: number): boolean => {
      // Add small buffer zone (5px) - balance between filling corridors and Smush AI navigation
      const buffer = 5;
      
      // Check all wall rectangles with buffer zone
      if ((x >= 22 - buffer && x <= 78 + buffer && y >= 42 - buffer && y <= 58 + buffer) ||  // Pink 1 left
          (x >= 242 - buffer && x <= 298 + buffer && y >= 42 - buffer && y <= 58 + buffer)) return true; // Pink 1 right
      if ((x >= 92 - buffer && x <= 148 + buffer && y >= 42 - buffer && y <= 58 + buffer) ||  // Blue left
          (x >= 172 - buffer && x <= 228 + buffer && y >= 42 - buffer && y <= 58 + buffer)) return true; // Blue right
      if ((x >= 22 - buffer && x <= 68 + buffer && y >= 72 - buffer && y <= 98 + buffer) ||   // Peach left
          (x >= 252 - buffer && x <= 298 + buffer && y >= 72 - buffer && y <= 98 + buffer)) return true; // Peach right
      if (x >= 111 - buffer && x <= 209 + buffer && y >= 72 - buffer && y <= 128 + buffer) return true; // Center mint
      if ((x >= 22 - buffer && x <= 68 + buffer && y >= 111 - buffer && y <= 158 + buffer) || // Lavender left
          (x >= 252 - buffer && x <= 298 + buffer && y >= 111 - buffer && y <= 158 + buffer)) return true; // Lavender right
      if ((x >= 82 - buffer && x <= 148 + buffer && y >= 142 - buffer && y <= 158 + buffer) || // Yellow left
          (x >= 172 - buffer && x <= 238 + buffer && y >= 142 - buffer && y <= 158 + buffer)) return true; // Yellow right
      if ((x >= 82 - buffer && x <= 95 + buffer && y >= 72 - buffer && y <= 158 + buffer) ||  // Yellow ext left
          (x >= 225 - buffer && x <= 238 + buffer && y >= 72 - buffer && y <= 158 + buffer)) return true; // Yellow ext right
      return false;
    };
    
    // Dense grid covering playfield below scoreboard (skip pie positions and walls)
    for (let x = 15; x < 310; x += spacing) {
      for (let y = 35; y < 170; y += spacing) { // Start below scoreboard/tunnel
        // Skip if this is a pie position
        const isPiePos = piePositions.some(p => p.x === x && p.y === y);
        if (isPiePos) continue;
        
        // Skip if under wall (don't add dot at all)
        if (isUnderWall(x, y)) {
          continue; // Skip completely - don't add to pies array
        }
        
        // Only add dots in corridors (visible and collectible)
        addDot(x, y);
        this.validDotPositions.push({ x, y });
      }
    }
    
    // Start with only 2 pie slices
    this.spawnNewPieSlice();
    this.spawnNewPieSlice();
    
    // Only count reachable dots (not pies, not under walls)
    const reachableDots = this.pies.filter(p => !p.getData('isPieSlice')).length;
    this.totalDots = reachableDots;
    this.dotsNeeded = Math.floor(this.totalDots * 0.5); // Grayson needs 50%
    
    console.log(`[Farmers Market] TOTAL DOTS: ${this.totalDots}`);
    console.log(`[Farmers Market] Grayson needs: ${this.dotsNeeded} dots (50%)`);
    console.log(`[Farmers Market] Smush wins if she gets: ${Math.floor(this.totalDots * 0.5) + 1} dots (50% + 1)`)
  }
  update() {
    // Handle menu input (ESC for pause, H for help, M for mute)
    if (handleMenuInput(this, this.controls, this.helpMenu, this.pauseMenu, undefined, undefined, this.gameState)) {
      return;
    }
    
    // Tutorial overlay handling
    if (this.showingTutorial) {
      if (shouldCloseDialogue(this.controls)) {
        this.hideTutorialOverlay();
      }
      return;
    }
    
    // Handle dialogue - show tutorial after first close (unless Smush won)
    if (this.dialogueManager.isVisible()) {
      if (shouldCloseDialogue(this.controls)) {
        this.dialogueManager.hide();
        
        // If Smush won, restart immediately instead of just closing dialogue
        if (this.smushWon) {
          this.scene.restart();
          return;
        }
        
        if (!this.tutorialShown) {
          // First dialogue closed - show tutorial
          this.showTutorialOverlay();
        }
      }
      return;
    }
    
    // Freeze everything if Smush won (dialogue already handled above)
    if (this.smushWon) {
      return; // Freeze all movement
    }
    
    // Player movement (only after entrance)
    if (this.entranceComplete) {
      this.handlePlayerMovement();
      
      // Smush AI (competitive - keeps moving even after Grayson wins)
      this.updateSmushAI();
      
      // Check tunnel wrapping (Pac-Man teleport)
      this.checkTunnelWrapping();
      
      // Check pie collection for both (Smush can still eat even after Grayson wins)
      this.checkPieCollection();
      
      // Spawn first fruit immediately, then on timer
      if (!this.firstFruitSpawned) {
        this.firstFruitSpawned = true;
        this.spawnFruit();
      }
      
      // Fruit spawning timer
      this.fruitSpawnTimer += this.game.loop.delta;
      if (this.fruitSpawnTimer >= this.fruitSpawnInterval) {
        this.fruitSpawnTimer = 0;
        this.spawnFruit();
      }
      
      // Check fruit collection
      this.checkFruitCollection();
      
      // Spawn first wine immediately
      if (!this.firstWineSpawned) {
        this.firstWineSpawned = true;
        this.spawnWineGlass();
      }
      
      // Wine glass spawning
      this.wineSpawnTimer += this.game.loop.delta;
      if (this.wineSpawnTimer >= this.wineSpawnInterval) {
        this.wineSpawnTimer = 0;
        this.spawnWineGlass();
      }
      
      // Check wine glass collision
      this.checkWineCollection();
      
      // Update drunk timer
      if (this.controlsReversed) {
        this.drunkTimer += this.game.loop.delta;
        if (this.drunkTimer >= this.drunkDuration) {
          this.controlsReversed = false;
          this.drunkTimer = 0;
          // Visual feedback - restore normal appearance
          this.player.setData('drunk', false);
        }
      }
      
      // Check card piece collection
      if (this.cardPiece) {
        this.checkCardCollection();
      }
      
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
      
      // DEBUG: Draw line from Smush to target (only in debug mode)
      if (DEBUG_SHOW_SMUSH_AI) {
        if (!this.debugLine) {
          this.debugLine = this.add.graphics();
          this.debugLine.setDepth(25);
        }
        
        this.debugLine.clear();
        
        if (this.smushCurrentTarget) {
          this.debugLine.lineStyle(2, 0xff00ff, 0.6); // Magenta line
          this.debugLine.beginPath();
          this.debugLine.moveTo(this.smushPhysics.x, this.smushPhysics.y);
          this.debugLine.lineTo(this.smushCurrentTarget.x, this.smushCurrentTarget.y);
          this.debugLine.strokePath();
          
          // Highlight target dot
          this.debugLine.fillStyle(0xff00ff, 0.8);
          this.debugLine.fillCircle(this.smushCurrentTarget.x, this.smushCurrentTarget.y, 4);
        }
      } else if (this.debugLine) {
        // Hide debug line if debug mode disabled
        this.debugLine.clear();
      }
    }
  }
  
  private checkTunnelWrapping() {
    const tunnelCenterX = 160;
    const tunnelHalfWidth = 12; // Half of 24px tunnel
    
    // Check if in vertical tunnels (top/bottom)
    const inVerticalTunnel = Math.abs(this.playerPhysics.x - tunnelCenterX) < tunnelHalfWidth;
    const smushInVerticalTunnel = Math.abs(this.smushPhysics.x - tunnelCenterX) < tunnelHalfWidth;
    
    // Grayson: Top tunnel → bottom (trigger at y < 25 before scoreboard blocks)
    if (inVerticalTunnel && this.playerPhysics.y < 25) {
      this.playerPhysics.setPosition(this.playerPhysics.x, 170);
    }
    
    // Grayson: Bottom tunnel → top
    if (inVerticalTunnel && this.playerPhysics.y > 170) {
      this.playerPhysics.setPosition(this.playerPhysics.x, 35);
    }
    
    // Smush: Top tunnel → bottom (trigger at y < 25 before scoreboard blocks)
    if (smushInVerticalTunnel && this.smushPhysics.y < 25) {
      this.smushPhysics.setPosition(this.smushPhysics.x, 170);
    }
    
    // Smush: Bottom tunnel → top
    if (smushInVerticalTunnel && this.smushPhysics.y > 170) {
      this.smushPhysics.setPosition(this.smushPhysics.x, 35);
    }
  }

  private handlePlayerMovement() {
    let vx = this.controls.left.isDown ? -1 :
             this.controls.right.isDown ? 1 : 0;
    let vy = this.controls.up.isDown ? -1 :
             this.controls.down.isDown ? 1 : 0;
    
    // Reverse controls if drunk!
    if (this.controlsReversed) {
      vx = -vx;
      vy = -vy;
    }
    
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
    // Strategic AI - simple and smooth
    this.smushTargetChangeTimer += this.game.loop.delta;
    
    // Check for stuck loop FIRST (before waiting for timer)
    const targetingPies = this.graysonPiesEaten < 3;
    const minTargetsForLoop = targetingPies ? 2 : 3;
    
    if (this.smushRecentTargets.length >= minTargetsForLoop && !this.smushWanderMode) {
      const positions = this.smushRecentTargets.map(t => `${Math.floor(t.x)},${Math.floor(t.y)}`);
      const uniquePositions = new Set(positions).size;
      
      if (uniquePositions <= minTargetsForLoop) {
        // Stuck in loop - enter wander mode immediately!
        console.log(`[Smush] LOOP DETECTED (${targetingPies ? 'PIES' : 'DOTS'}) - entering wander mode NOW`);
        this.smushWanderMode = true;
        this.smushWanderTimer = 0;
        this.smushRecentTargets = [];
        this.smushCurrentTarget = null;
        this.smushBlockedFrames = 0;
      }
    }
    
    // If in wander mode, just wander for a while
    if (this.smushWanderMode) {
      this.smushWanderTimer += this.game.loop.delta;
      
      // Check if still trapped between yellow walls
      const stillTrapped = this.smushPhysics.x > 95 && this.smushPhysics.x < 225 && 
                           this.smushPhysics.y > 35 && this.smushPhysics.y < 165;
      
      // Only exit wander mode if: time is up AND escaped trapped area
      if (this.smushWanderTimer > 1500 && !stillTrapped) {
        this.smushWanderMode = false;
        this.smushWanderTimer = 0;
        this.smushRecentTargets = []; // Clear history, fresh start
        console.log(`[Smush] Wander complete - escaped to free area`);
      } else if (this.smushWanderTimer > 1500 && stillTrapped) {
        // Still stuck after 1.5s - extend wander time
        this.smushWanderTimer = 1200; // Keep wandering, almost done
        console.log(`[Smush] Still trapped - extending wander time`);
      }
      // Don't return - let moveSmushToTarget handle the wandering movement
    }
    
    const availableDots = this.pies.filter(p => 
      p.active && // Must be active (not destroyed)
      !p.getData('collected') && 
      p.alpha > 0.5
    );
    
    // Pick new target periodically, when collected, or when blocked too long
    if (!this.smushCurrentTarget || 
        this.smushCurrentTarget.getData('collected') ||
        !this.smushCurrentTarget.active ||
        this.smushTargetChangeTimer > 1500 || // Retarget every 1.5s (faster reactions)
        this.smushBlockedFrames > 3) { // Force retarget if blocked for 3 frames (very fast!)
      
      this.smushTargetChangeTimer = 0;
      this.smushBlockedFrames = 0; // Reset blocked counter when picking new target
      
      // If target was collected, clear recent targets (can go back to that area)
      if (this.smushCurrentTarget && this.smushCurrentTarget.getData('collected')) {
        this.smushRecentTargets = [];
      }
      
      const pieSlices = availableDots.filter(p => p.getData('isPieSlice'));
      const dots = availableDots.filter(p => !p.getData('isPieSlice'));
      
      // Add current target to recent list first (before picking new one)
      if (this.smushCurrentTarget && !this.smushCurrentTarget.getData('collected')) {
        this.smushRecentTargets.push(this.smushCurrentTarget);
        
        // Keep only last N targets (loop detection happens at top of updateSmushAI)
        const targetingPies = this.graysonPiesEaten < 3;
        const minTargetsForLoop = targetingPies ? 2 : 3;
        if (this.smushRecentTargets.length > minTargetsForLoop) {
          this.smushRecentTargets.shift();
        }
      }
      
      // Strategy: Only go for pies until Grayson gets 3, then switch to dots
      if (this.graysonPiesEaten < 3 && pieSlices.length > 0) {
        // Block Grayson - get pies!
        const piesExcludingRecent = pieSlices.filter(p => !this.smushRecentTargets.includes(p));
        const targetPool = piesExcludingRecent.length > 0 ? piesExcludingRecent : pieSlices;
        
        this.smushCurrentTarget = this.findClosest(targetPool);
        console.log(`[Smush] NEW TARGET: PIE at (${Math.floor(this.smushCurrentTarget?.x || 0)}, ${Math.floor(this.smushCurrentTarget?.y || 0)}) | Excluded: ${this.smushRecentTargets.length}`);
      } else if (dots.length > 0) {
        // Grayson has 3 pies - race for dots!
        // Exclude last 3 targets to avoid ping-ponging
        const dotsExcludingRecent = dots.filter(d => !this.smushRecentTargets.includes(d));
        const targetPool = dotsExcludingRecent.length > 0 ? dotsExcludingRecent : dots;
        
        // Use smart scoring (prefers same horizontal level)
        this.smushCurrentTarget = this.findClosest(targetPool);
        const yDiff = Math.abs(this.smushPhysics.y - (this.smushCurrentTarget?.y || 0));
        console.log(`[Smush] NEW TARGET: DOT at (${Math.floor(this.smushCurrentTarget?.x || 0)}, ${Math.floor(this.smushCurrentTarget?.y || 0)}) | Y-diff: ${Math.floor(yDiff)} | Available: ${dots.length} | Excluded: ${this.smushRecentTargets.length}`);
      } else if (pieSlices.length > 0) {
        // Fallback to pies
        const piesExcludingRecent = pieSlices.filter(p => !this.smushRecentTargets.includes(p));
        const targetPool = piesExcludingRecent.length > 0 ? piesExcludingRecent : pieSlices;
        
        this.smushCurrentTarget = this.findClosest(targetPool);
        if (DEBUG_SHOW_SMUSH_AI) {
          console.log(`[Smush] NEW TARGET: FALLBACK PIE at (${Math.floor(this.smushCurrentTarget?.x || 0)}, ${Math.floor(this.smushCurrentTarget?.y || 0)}) | Excluded: ${this.smushRecentTargets.length}`);
        }
      }
    }
    
    // Move Smush to her current target
    this.moveSmushToTarget();
  }
  
  private findClosest(targets: Phaser.GameObjects.Graphics[]): Phaser.GameObjects.Graphics | null {
    if (targets.length === 0) return null;
    
    let best: Phaser.GameObjects.Graphics | null = null;
    let bestScore = Infinity;
    
    targets.forEach(target => {
      const dist = Phaser.Math.Distance.Between(
        this.smushPhysics.x, this.smushPhysics.y,
        target.x, target.y
      );
      
      // Prefer dots on same horizontal corridor (similar Y value)
      const yDiff = Math.abs(this.smushPhysics.y - target.y);
      
      // Score = distance + small penalty for different Y levels
      // Mostly chase closest, slight preference for horizontal
      const score = dist + (yDiff * 0.8); // 0.8x penalty - prioritize closest target
      
      if (score < bestScore) {
        bestScore = score;
        best = target;
      }
    });
    
    return best;
  }
  
  private moveSmushToTarget() {
    // If in wander mode, navigate toward tunnels/edges to escape central area
    if (this.smushWanderMode) {
      const body = this.smushPhysics.body as Phaser.Physics.Arcade.Body;
      
      // Check if Smush is trapped between yellow walls (needs to use tunnels to escape)
      // Yellow walls define a vertical cage from x~95 to x~225
      // She should navigate to tunnels if she's in this area (but not already AT a tunnel)
      const betweenYellowWalls = this.smushPhysics.x > 95 && this.smushPhysics.x < 225;
      const notAtTunnel = this.smushPhysics.y > 35 && this.smushPhysics.y < 175;
      const needsTunnelEscape = betweenYellowWalls && notAtTunnel;
      
      console.log(`[Smush] WANDER at (${Math.floor(this.smushPhysics.x)}, ${Math.floor(this.smushPhysics.y)}) | NeedsTunnel: ${needsTunnelEscape}`);
      
      // Check if reached a tunnel entrance (CENTER of screen at top/bottom)
      const atTopTunnel = this.smushPhysics.y < 35 && 
                          this.smushPhysics.x > 150 && this.smushPhysics.x < 170; // Center X
      const atBottomTunnel = this.smushPhysics.y > 165 && 
                             this.smushPhysics.x > 150 && this.smushPhysics.x < 170; // Center X
      
      if (atTopTunnel || atBottomTunnel) {
        // Reached tunnel entrance! Exit wander mode immediately
        console.log(`[Smush] REACHED TUNNEL ENTRANCE - exiting wander mode`);
        this.smushWanderMode = false;
        this.smushWanderTimer = 0;
        this.smushRecentTargets = [];
        return;
      }
      
      if (needsTunnelEscape) {
        // Trapped between yellow walls - need to escape via tunnels
        
        // Trapped between yellow walls - navigate toward tunnel entrance
        // Tunnels are at center X (150-170)
        const needsHorizontalAlign = this.smushPhysics.x < 150 || this.smushPhysics.x > 170;
        
        if (needsHorizontalAlign) {
          // First priority: Get to center X (tunnel entrance)
          if (this.smushPhysics.x < 150 && !body.blocked.right) {
            this.smushPhysics.setVelocity(this.smushSpeed, 0); // Move right to tunnel
            console.log(`[Smush] WANDER: Moving right to align with tunnel`);
          } else if (this.smushPhysics.x > 170 && !body.blocked.left) {
            this.smushPhysics.setVelocity(-this.smushSpeed, 0); // Move left to tunnel
            console.log(`[Smush] WANDER: Moving left to align with tunnel`);
          } else {
            // Blocked horizontally, try vertical
            if (this.smushPhysics.y < 90 && !body.blocked.up) {
              this.smushPhysics.setVelocity(0, -this.smushSpeed);
            } else if (this.smushPhysics.y >= 90 && !body.blocked.down) {
              this.smushPhysics.setVelocity(0, this.smushSpeed);
            }
          }
        } else {
          // Aligned horizontally - now go vertical to tunnel
          if (this.smushPhysics.y < 90) {
            // Upper half - go up to top tunnel
            if (!body.blocked.up) {
              this.smushPhysics.setVelocity(0, -this.smushSpeed);
              console.log(`[Smush] WANDER: Navigating UP to top tunnel`);
            }
          } else {
            // Lower half - go down to bottom tunnel
            if (!body.blocked.down) {
              this.smushPhysics.setVelocity(0, this.smushSpeed);
              console.log(`[Smush] WANDER: Navigating DOWN to bottom tunnel`);
            }
          }
        }
      } else {
        // Outside center - normal random wander
        const openDirections: {vx: number, vy: number}[] = [];
        
        if (!body.blocked.up) openDirections.push({ vx: 0, vy: -this.smushSpeed });
        if (!body.blocked.down) openDirections.push({ vx: 0, vy: this.smushSpeed });
        if (!body.blocked.left) openDirections.push({ vx: -this.smushSpeed, vy: 0 });
        if (!body.blocked.right) openDirections.push({ vx: this.smushSpeed, vy: 0 });
        
        if (openDirections.length > 0 && this.smushWanderTimer % 500 < 16) {
          const randomDir = openDirections[Math.floor(Math.random() * openDirections.length)];
          this.smushPhysics.setVelocity(randomDir.vx, randomDir.vy);
          
          // Flip sprite
          if (randomDir.vx < 0) this.smush.setScale(-1, 1);
          else if (randomDir.vx > 0) this.smush.setScale(1, 1);
        }
      }
      return;
    }
    
    const target = this.smushCurrentTarget;
    
    // Validate target is still valid (active and not collected)
    if (target && (!target.active || target.getData('collected'))) {
      this.smushCurrentTarget = null; // Clear invalid target
      this.smushPhysics.setVelocity(0, 0);
      return;
    }
    
    // Move toward target
    if (target) {
      const angle = Phaser.Math.Angle.Between(
        this.smushPhysics.x, this.smushPhysics.y,
        target.x, target.y
      );
      
      let vx = Math.cos(angle) * this.smushSpeed;
      let vy = Math.sin(angle) * this.smushSpeed;
      
      // If blocked, just zero out blocked directions (simple and smooth)
      const body = this.smushPhysics.body as Phaser.Physics.Arcade.Body;
      
      let wasBlocked = false;
      if (body.blocked.up && vy < 0) { vy = 0; wasBlocked = true; }
      if (body.blocked.down && vy > 0) { vy = 0; wasBlocked = true; }
      if (body.blocked.left && vx < 0) { vx = 0; wasBlocked = true; }
      if (body.blocked.right && vx > 0) { vx = 0; wasBlocked = true; }
      
      // Track how long we've been blocked
      if (wasBlocked && (vx === 0 && vy === 0)) {
        // Completely blocked (can't move in any direction toward target)
        this.smushBlockedFrames++;
      } else {
        // Either not blocked or can still move in some direction
        this.smushBlockedFrames = 0;
      }
      
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
      if (!pie.active || pie.getData('collected')) return; // Skip if already destroyed or collected
      
      // Check Grayson using proximity utility
      if (checkProximity(this.playerPhysics, pie, 12)) {
        const isPieSlice = pie.getData('isPieSlice');
        
        pie.setData('collected', true);
        pie.destroy();
        
        // Check if it's a pie slice or just a dot
        if (isPieSlice) {
          this.graysonPiesEaten++;
          
          // Spawn new pie slice (if haven't reached max)
          this.spawnNewPieSlice();
        } else {
          this.graysonDotsEaten++;
        }
        
        // Update scoreboard
        this.updateScoreboard();
        
        // Win condition: enough dots AND 3 pies (spawn card piece)
        if (this.graysonDotsEaten >= this.dotsNeeded && this.graysonPiesEaten >= this.piesNeeded && !this.hasWonConditions) {
          this.hasWonConditions = true;
          this.spawnCardPiece();
        }
        return;
      }
      
      // Check Smush using proximity utility
      if (checkProximity(this.smushPhysics, pie, 12)) {
        pie.setData('collected', true);
        
        // Check if it's a pie slice or just a dot BEFORE destroying
        const isPieSlice = pie.getData('isPieSlice');
        
        pie.destroy();
        
        if (isPieSlice) {
          // Smush ate a pie - track and spawn new one
          this.smushPiesEaten++;
          this.spawnNewPieSlice();
        } else {
          this.smushDotsEaten++;
        }
        
        // Update scoreboard FIRST (before checking win)
        this.updateScoreboard();
        
        // Check win conditions (Smush wins if 3 pies OR 50%+1 of dots)
        const smushDotsNeeded = Math.floor(this.totalDots * 0.5) + 1; // Smush needs 50% + 1
        
        if (this.smushPiesEaten >= 3) {
          // Smush ate 3 pies - Grayson can't win anymore!
          this.smushWins();
        } else if (this.smushDotsEaten >= smushDotsNeeded) {
          // Smush ate 50%+1 of dots
          this.smushWins();
        }
        return;
      }
    });
  }

  private spawnCardPiece() {
    // Pick random valid corridor position
    if (this.validDotPositions.length === 0) return;
    const pos = this.validDotPositions[Math.floor(Math.random() * this.validDotPositions.length)];
    
    // Dramatic entrance - flash the screen
    const flash = this.add.rectangle(160, 90, 320, 180, 0xffffff, 0);
    flash.setDepth(50);
    
    this.tweens.add({
      targets: flash,
      alpha: 0.7,
      duration: 200,
      yoyo: true,
      onComplete: () => flash.destroy()
    });
    
    // Create glowing card piece
    this.cardPiece = createCardPieceSprite(this, pos.x, pos.y);
    this.cardPiece.setDepth(20);
    this.cardPiece.setScale(0); // Start small
    
    // Scale up animation (dramatic entrance)
    this.tweens.add({
      targets: this.cardPiece,
      scale: 1.5,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        // Then start pulsing (check if card still exists)
        if (this.cardPiece && this.cardPiece.active) {
          this.tweens.add({
            targets: this.cardPiece,
            scale: 1.8,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
          });
        }
      }
    });
    
    // Massive sparkle burst
    for (let i = 0; i < 20; i++) {
      this.time.delayedCall(i * 50, () => {
        spawnCardPieceSparkles(this, pos.x, pos.y);
      });
    }
    
    // Glowing filled circle around card
    const glow = this.add.graphics();
    glow.fillStyle(0xffd700, 0.4);
    glow.fillCircle(pos.x, pos.y, 20);
    glow.setDepth(19);
    
    this.tweens.add({
      targets: glow,
      alpha: 0,
      duration: 1000,
      repeat: -1,
      yoyo: true,
      ease: "Sine.easeInOut"
    });
  }
  
  private checkCardCollection() {
    if (!this.cardPiece) return;
    
    const dist = Phaser.Math.Distance.Between(
      this.playerPhysics.x, this.playerPhysics.y,
      this.cardPiece.x, this.cardPiece.y
    );
    
    if (dist < 15) {
      // Collected the card!
      this.cardPiece.destroy();
      this.cardPiece = null;
      
      // Transition back to GameScene (faster)
      this.time.delayedCall(200, () => {
        this.gameState.completeLevel(VOID_LEVELS.AFTER_FARMERS_MARKET);
        fadeToScene(this, SCENES.GAME, 1000);
      });
    }
  }
  
  private smushWins() {
    this.smushWon = true; // Freeze everything
    
    // Determine why she won
    let reason = "";
    if (this.smushPiesEaten >= 3) {
      reason = `(Got 3 pies!)`;
    } else {
      const smushDotsNeeded = Math.floor(this.totalDots * 0.5) + 1;
      reason = `(Got ${this.smushDotsEaten}/${smushDotsNeeded} dots - over 50%!)`;
    }
    
    this.dialogueManager.show(`Smush: *Meow meow!* (I win!) ${reason}\nGrayson: Okay okay, let's try again...\n\nPress ENTER to retry`);
  }
  
  private spawnFruit() {
    // Random fruit type - BRIGHT saturated colors to stand out!
    const fruitTypes = [
      { name: 'plum', color: 0xff00ff },    // Bright magenta
      { name: 'peach', color: 0xff8800 },   // Bright orange
      { name: 'apple', color: 0xff0044 },   // Bright red-pink
      { name: 'banana', color: 0xffff00 }   // Bright yellow
    ];
    
    const fruitType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    
    // Pick valid corridor position NEAR the player (within 60px, but not too close)
    if (this.validDotPositions.length === 0) return; // No valid positions
    
    const playerX = this.playerPhysics.x;
    const playerY = this.playerPhysics.y;
    const minDist = 25; // Not too close (give player a chance to see it)
    const maxDist = 60; // Close enough to be reachable
    
    // Filter positions near player
    const nearbyPositions = this.validDotPositions.filter(pos => {
      const dist = Math.sqrt((pos.x - playerX) ** 2 + (pos.y - playerY) ** 2);
      return dist >= minDist && dist <= maxDist;
    });
    
    // Use nearby position if available, otherwise fallback to random
    const positionPool = nearbyPositions.length > 0 ? nearbyPositions : this.validDotPositions;
    const randomPos = positionPool[Math.floor(Math.random() * positionPool.length)];
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
      // Check proximity using utility
      if (checkProximity(this.playerPhysics, fruit, 12)) {
        // Collect fruit - speed boost!
        fruit.destroy();
        const index = this.fruits.indexOf(fruit);
        if (index > -1) this.fruits.splice(index, 1);
        
        // Speed boost
        this.speed = 180; // Much faster!
        
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
  
  private spawnWineGlass() {
    // Spawn wine glass at random valid position (near player but not too close)
    if (this.validDotPositions.length === 0) return;
    
    const playerX = this.playerPhysics.x;
    const playerY = this.playerPhysics.y;
    const minDist = 15; // Give player some breathing room
    const maxDist = 35; // Spawn at a reasonable distance
    
    // Filter positions in range
    const nearbyPositions = this.validDotPositions.filter(pos => {
      const dist = Math.sqrt((pos.x - playerX) ** 2 + (pos.y - playerY) ** 2);
      return dist >= minDist && dist <= maxDist;
    });
    
    const positionPool = nearbyPositions.length > 0 ? nearbyPositions : this.validDotPositions;
    const randomPos = positionPool[Math.floor(Math.random() * positionPool.length)];
    
    // Create wine glass graphic
    const wine = this.add.graphics();
    
    // Draw wine glass - simple goblet shape
    const wineColor = 0x722f37; // Dark red wine color
    const glassColor = 0xcccccc; // Light gray for glass
    
    // Glass stem
    wine.fillStyle(glassColor, 1);
    wine.fillRect(-1, 2, 2, 4); // Thin stem
    
    // Glass base
    wine.fillRect(-3, 6, 6, 1); // Base
    
    // Glass bowl
    wine.fillStyle(glassColor, 0.6);
    wine.fillRect(-4, -3, 8, 5); // Bowl outline
    
    // Wine inside
    wine.fillStyle(wineColor, 1);
    wine.fillRect(-3, -2, 6, 4); // Wine fill
    
    wine.setPosition(randomPos.x, randomPos.y);
    wine.setDepth(6);
    wine.setData('isWine', true);
    
    // Gentle wobble animation
    this.tweens.add({
      targets: wine,
      angle: 5,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    
    this.wineGlasses.push(wine);
    
    // Auto-despawn after 15 seconds
    this.time.delayedCall(10000, () => {
      if (wine.active) {
        wine.destroy();
        const index = this.wineGlasses.indexOf(wine);
        if (index > -1) this.wineGlasses.splice(index, 1);
      }
    });
  }
  
  private checkWineCollection() {
    this.wineGlasses.forEach(wine => {
      if (checkProximity(this.playerPhysics, wine, 10)) {
        // Collect wine - get drunk!
        wine.destroy();
        const index = this.wineGlasses.indexOf(wine);
        if (index > -1) this.wineGlasses.splice(index, 1);
        
        // Activate drunk effect
        this.controlsReversed = true;
        this.drunkTimer = 0;
        this.player.setData('drunk', true);
        
        // Visual feedback - tint player
        const graphics = this.player.getAt(0) as Phaser.GameObjects.Graphics;
        if (graphics) {
          // Flash effect
          this.tweens.add({
            targets: this.player,
            alpha: 0.6,
            duration: 200,
            yoyo: true,
            repeat: 3
          });
        }
        
        // Show "DRUNK!" text
        const drunkText = this.add.text(this.playerPhysics.x, this.playerPhysics.y - 15, "🍷 DRUNK!", {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#ff6b6b",
          fontStyle: "bold"
        }).setOrigin(0.5).setDepth(100);
        
        // Float up and fade
        this.tweens.add({
          targets: drunkText,
          y: drunkText.y - 20,
          alpha: 0,
          duration: 1000,
          onComplete: () => drunkText.destroy()
        });
      }
    });
  }
  
  private spawnNewPieSlice() {
    // Check if we've reached max pies
    if (this.totalPiesSpawned >= this.maxPiesToSpawn) return;
    if (this.validDotPositions.length === 0) return;
    
    const playerX = this.playerPhysics?.x ?? 160;
    const playerY = this.playerPhysics?.y ?? 90;
    const minDistFromPlayer = 60; // Pies must spawn at least 60px away from Grayson
    
    // Find positions that don't have existing ACTIVE pies AND are far enough from player
    const availablePositions = this.validDotPositions.filter(vPos => {
      // Check distance from player
      const distFromPlayer = Math.sqrt((vPos.x - playerX) ** 2 + (vPos.y - playerY) ** 2);
      if (distFromPlayer < minDistFromPlayer) return false;
      
      // Check if there's already an active pie at this position
      const hasPie = this.pies.some(p => 
        p.active && // Only check active (not destroyed) pies
        p.getData('isPieSlice') && 
        !p.getData('collected') && 
        Math.abs(p.x - vPos.x) < 3 && 
        Math.abs(p.y - vPos.y) < 3
      );
      return !hasPie;
    });
    
    if (availablePositions.length === 0) {
      // If no positions available, just pick a random one
      const pos = this.validDotPositions[Math.floor(Math.random() * this.validDotPositions.length)];
      const pie = createPieSliceSprite(this, pos.x, pos.y);
      pie.setDepth(8);
      pie.setData('isPie', true);
      pie.setData('isPieSlice', true);
      pie.setData('collected', false);
      this.pies.push(pie);
      this.totalPiesSpawned++;
      return;
    }
    
    // Pick random available corridor position
    const pos = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    
    // Create pie slice
    const pie = createPieSliceSprite(this, pos.x, pos.y);
    pie.setDepth(8); // Higher depth to be visible above everything
    pie.setData('isPie', true);
    pie.setData('isPieSlice', true);
    pie.setData('collected', false);
    this.pies.push(pie);
    
    this.totalPiesSpawned++;
  }
  
  private spawnShopper() {
    // Predefined walking lanes spanning full maze width (wall to wall)
    const lanes = [
      { y: 65, xStart: 12, xEnd: 308 },  // Between pink/blue and peach/mint (full width)
      { y: 165, xStart: 12, xEnd: 308 }, // Bottom corridor (full width)
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
      
      let isMoving = false;
      
      if (!shopper.returning) {
        // Walking toward target
        if (distX > 2 || distY > 2) {
          isMoving = true;
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
      
      // Animate walking
      updateShopperWalk(shopper.sprite, isMoving);
      
      // Sync sprite with physics
      shopper.sprite.x = shopper.physics.x;
      shopper.sprite.y = shopper.physics.y;
    });
  }
  
  private showTutorialOverlay() {
    this.showingTutorial = true;
    this.tutorialShown = true;
    
    // Create container for overlay
    this.tutorialOverlay = this.add.container(160, 90);
    this.tutorialOverlay.setDepth(1000);
    
    // Background overlay with border
    const overlay = this.add.rectangle(0, 0, 260, 140, 0x1a1a2e, 0.95);
    overlay.setStrokeStyle(2, 0xf472b6);
    this.tutorialOverlay.add(overlay);
    
    // Title
    const title = this.add.text(0, -55, "★ FARMERS MARKET ★", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#f472b6",
      align: "center"
    }).setOrigin(0.5);
    this.tutorialOverlay.add(title);
    
    // Instructions
    const instructions = [
      `Eat 3 PIE SLICES + ${this.dotsNeeded} dots (50%)`,
      "",
      "Smush wins with 3 pies OR 50%+1 dots",
      "Grab FRUITS for speed boost",
      "Avoid WINE samples or get tipsy"
    ].join("\n");
    
    const text = this.add.text(0, 5, instructions, {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#ffffff",
      align: "center",
      lineSpacing: 3
    }).setOrigin(0.5);
    this.tutorialOverlay.add(text);
    
    const pressEnter = this.add.text(0, 55, "[ PRESS ENTER ]", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#ffff00"
    }).setOrigin(0.5);
    this.tutorialOverlay.add(pressEnter);
    
    // Pulse animation for Press ENTER
    this.tweens.add({
      targets: pressEnter,
      alpha: 0.5,
      duration: 600,
      yoyo: true,
      repeat: -1
    });
  }
  
  private hideTutorialOverlay() {
    if (this.tutorialOverlay) {
      this.tutorialOverlay.destroy();
      this.tutorialOverlay = null;
    }
    this.showingTutorial = false;
    // entranceComplete already true from entrance animations
    
    // Spawn first shopper immediately when game starts
    this.spawnShopper();
  }
}




