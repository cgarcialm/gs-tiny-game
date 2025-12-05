import Phaser from "phaser";
import { initializeGameScene } from "../utils/sceneSetup";
import { fadeToScene } from "../utils/sceneTransitions";
import { handleMenuInput } from "../utils/menuHandler";
import { GameStateManager } from "../managers/GameStateManager";
import { SCENES, VOID_LEVELS } from "../config/sceneConstants";
import { HELP_HINT_X, HELP_HINT_Y } from "../utils/controls";
import { HELP_HINT_TEXT_STYLE } from "../config/textStyles";
import { createCardPieceSprite, spawnCardPieceSparkles } from "../utils/sprites";
import type { GameControls } from "../utils/controls";
import type { HelpMenu } from "../utils/helpMenu";
import type { PauseMenu } from "../utils/pauseMenu";

/**
 * Seattle Traffic Scene - Top-Down Lane Runner
 * Drive burgundy van through Seattle traffic to reach trailhead before 8 AM
 * Story: Hiking trip with Ceci & Ebo - late start, wrong Starbucks, traffic nightmare
 */
export default class SeattleTrafficScene extends Phaser.Scene {
  private gameState!: GameStateManager;
  private controls!: GameControls;
  private helpMenu!: HelpMenu;
  private pauseMenu!: PauseMenu;
  
  // Player van
  private van!: Phaser.GameObjects.Container;
  private currentLane = 1; // 0=left, 1=center, 2=right
  private isChangingLane = false;
  
  // Road perspective settings
  private horizonY = 40; // Where the road vanishes
  private roadBottomY = 180; // Bottom of screen
  private roadTopWidth = 60; // Road width at horizon
  private roadBottomWidth = 280; // Road width at bottom
  private vanY = 150; // Van's Y position (near bottom)
  
  // Road scrolling
  private roadSpeed = 100; // Base scrolling speed
  private roadOffset = 0;
  private laneMarkers: Phaser.GameObjects.Graphics[] = [];
  
  // Traffic cars
  private trafficCars: { container: Phaser.GameObjects.Container, lane: number, speed: number, y: number }[] = [];
  private carSpawnTimer = 0;
  private carSpawnInterval = 2000; // Spawn every 2 seconds
  
  // Game state
  private gamePhase: 'intro' | 'toStarbucks1' | 'atStarbucks1' | 'toStarbucks2' | 'atStarbucks2' | 'toTrailhead' | 'won' | 'lost' = 'intro';
  private distanceTraveled = 0;
  private currentTime = 7 * 60 + 15; // 7:15 AM in minutes
  private rageLevel = 0; // 0-100
  private stuckTimer = 0;
  
  // Checkpoints
  private starbucks1Distance = 500;
  private starbucks2Distance = 1000;
  private trailheadDistance = 2000;
  
  // Card piece (on win)
  private cardPiece: Phaser.GameObjects.Graphics | null = null;
  
  // Event handler reference for cleanup
  private skipHandler?: () => void;

  constructor() {
    super("SeattleTraffic");
  }

  create() {
    // Initialize common scene elements
    const setup = initializeGameScene(this);
    this.controls = setup.controls;
    this.helpMenu = setup.helpMenu;
    this.pauseMenu = setup.pauseMenu;
    this.gameState = setup.gameState;
    
    // Reset state
    this.gamePhase = 'intro';
    this.currentLane = 1;
    this.isChangingLane = false;
    this.distanceTraveled = 0;
    this.currentTime = 7 * 60 + 15;
    this.rageLevel = 0;
    this.stuckTimer = 0;
    this.trafficCars = [];
    this.laneMarkers = [];
    this.roadOffset = 0;
    this.cardPiece = null;
    
    // Create road
    this.createRoad();
    
    // Create player van
    this.createVan();
    
    // Create UI
    this.createUI();
    
    // Help hint (bottom-right corner)
    this.add.text(HELP_HINT_X, HELP_HINT_Y, "H for Help", HELP_HINT_TEXT_STYLE)
      .setOrigin(1, 1)
      .setDepth(10);
    
    // Add skip button (level in development)
    const skipText = this.add.text(160, 90, "Seattle Traffic level in progress...\nPress ENTER to skip to next level", {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 8 },
      align: 'center'
    });
    skipText.setOrigin(0.5);
    skipText.setDepth(1000);
    
    // Wait for ENTER to skip
    this.skipHandler = () => {
      skipText.destroy();
      // Progress to level 3 (Smush)
      this.gameState.completeLevel(VOID_LEVELS.AFTER_SEATTLE_TRAFFIC);
      fadeToScene(this, SCENES.GAME, 1000);
    };
    this.input.keyboard?.on('keydown-ENTER', this.skipHandler);
    
    // Start intro sequence (can still be implemented later)
    this.startIntroSequence();
  }

  update() {
    // Handle menu input (ESC for pause, H for help, M for mute)
    if (handleMenuInput(this, this.controls, this.helpMenu, this.pauseMenu, undefined, undefined, this.gameState)) {
      return;
    }
    
    const dt = this.game.loop.delta;
    
    // Different update based on phase
    if (this.gamePhase === 'intro') {
      // Waiting for intro to finish
      return;
    }
    
    if (this.gamePhase === 'won' || this.gamePhase === 'lost') {
      // Game over - check for card collection
      if (this.cardPiece) {
        this.checkCardCollection();
      }
      return;
    }
    
    // Active gameplay phases
    if (this.gamePhase.startsWith('to')) {
      this.updateDriving(dt);
      this.updateTraffic(dt);
      this.updateClock(dt);
      this.updateRage(dt);
      this.checkCheckpoints();
      this.checkGameOver();
      this.updateUI();
    }
  }
  
  private createRoad() {
    // Sky/background
    const sky = this.add.rectangle(160, this.horizonY / 2, 320, this.horizonY, 0x4a90a4);
    sky.setDepth(0);
    
    // Ground/grass on sides
    const ground = this.add.rectangle(160, (this.horizonY + this.roadBottomY) / 2, 320, this.roadBottomY - this.horizonY, 0x3d5c3d);
    ground.setDepth(0);
    
    // Draw perspective road
    const roadGraphics = this.add.graphics();
    roadGraphics.setDepth(1);
    
    // Road surface (dark gray trapezoid)
    roadGraphics.fillStyle(0x333333, 1);
    roadGraphics.beginPath();
    roadGraphics.moveTo(160 - this.roadTopWidth / 2, this.horizonY); // Top-left
    roadGraphics.lineTo(160 + this.roadTopWidth / 2, this.horizonY); // Top-right
    roadGraphics.lineTo(160 + this.roadBottomWidth / 2, this.roadBottomY); // Bottom-right
    roadGraphics.lineTo(160 - this.roadBottomWidth / 2, this.roadBottomY); // Bottom-left
    roadGraphics.closePath();
    roadGraphics.fillPath();
    
    // Road edges (white lines)
    roadGraphics.lineStyle(2, 0xffffff, 1);
    // Left edge
    roadGraphics.lineBetween(
      160 - this.roadTopWidth / 2, this.horizonY,
      160 - this.roadBottomWidth / 2, this.roadBottomY
    );
    // Right edge
    roadGraphics.lineBetween(
      160 + this.roadTopWidth / 2, this.horizonY,
      160 + this.roadBottomWidth / 2, this.roadBottomY
    );
    
    // Create lane dividers (will be animated)
    this.createLaneMarkers();
  }
  
  private createLaneMarkers() {
    // Create dashed lane dividers that will scroll
    const numMarkers = 8; // Number of dash segments per lane
    
    for (let lane = 0; lane < 2; lane++) { // 2 dividers for 3 lanes
      for (let i = 0; i < numMarkers; i++) {
        const marker = this.add.graphics();
        marker.setDepth(2);
        this.laneMarkers.push(marker);
        marker.setData('lane', lane);
        marker.setData('index', i);
      }
    }
    
    this.updateLaneMarkers();
  }
  
  private updateLaneMarkers() {
    const numMarkers = 8;
    const markerSpacing = (this.roadBottomY - this.horizonY) / numMarkers;
    
    this.laneMarkers.forEach((marker) => {
      marker.clear();
      
      const lane = marker.getData('lane') as number;
      const index = marker.getData('index') as number;
      
      // Calculate Y position with scroll offset
      const baseY = this.horizonY + (index * markerSpacing) + (this.roadOffset % markerSpacing);
      
      if (baseY < this.horizonY || baseY > this.roadBottomY - 5) return;
      
      // Calculate perspective factor (0 at horizon, 1 at bottom)
      const t = (baseY - this.horizonY) / (this.roadBottomY - this.horizonY);
      
      // Road width at this Y position
      const roadWidth = this.roadTopWidth + (this.roadBottomWidth - this.roadTopWidth) * t;
      const roadLeft = 160 - roadWidth / 2;
      
      // Lane divider X position (1/3 and 2/3 across the road)
      const laneX = roadLeft + roadWidth * (lane + 1) / 3;
      
      // Marker length scales with perspective
      const markerLength = 3 + t * 8;
      const markerWidth = 1 + t * 2;
      
      // Draw yellow dashed line
      marker.fillStyle(0xffff00, 1);
      marker.fillRect(laneX - markerWidth / 2, baseY, markerWidth, markerLength);
    });
  }
  
  // Get X position for a lane at the van's Y position
  private getLaneX(lane: number): number {
    const t = (this.vanY - this.horizonY) / (this.roadBottomY - this.horizonY);
    const roadWidth = this.roadTopWidth + (this.roadBottomWidth - this.roadTopWidth) * t;
    const roadLeft = 160 - roadWidth / 2;
    
    // Lanes are at 1/6, 3/6, 5/6 of the road width (center of each lane)
    const lanePositions = [1/6, 3/6, 5/6];
    return roadLeft + roadWidth * lanePositions[lane];
  }
  
  private createVan() {
    // Burgundy van at bottom of screen (with perspective - larger since closer)
    this.van = this.add.container(this.getLaneX(1), this.vanY);
    this.van.setDepth(10);
    
    // Van sprite (burgundy) - larger since it's in foreground
    const body = this.add.rectangle(0, 0, 24, 36, 0x8B0000); // Burgundy
    const windshield = this.add.rectangle(0, -10, 20, 10, 0x87CEEB); // Light blue
    const wheels = this.add.graphics();
    wheels.fillStyle(0x000000, 1);
    wheels.fillRect(-12, 12, 6, 8); // Left wheel
    wheels.fillRect(6, 12, 6, 8); // Right wheel
    
    // Add some detail - roof rack
    const rack = this.add.rectangle(0, -16, 18, 3, 0x333333);
    
    this.van.add([body, windshield, wheels, rack]);
  }
  
  private createUI() {
    // Clock (top-left)
    this.add.text(10, 10, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 }
    }).setDepth(100).setName('clockText');
    
    // Rage meter (bottom)
    this.add.rectangle(160, 170, 200, 8, 0x333333).setDepth(100);
    this.add.rectangle(61, 170, 0, 6, 0xff0000).setDepth(101).setName('rageMeter').setOrigin(0, 0.5);
    this.add.text(10, 170, "RAGE", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ffffff"
    }).setDepth(102).setOrigin(0, 0.5);
    
    // Distance indicator (top-right)
    this.add.text(310, 10, "", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 }
    }).setDepth(100).setOrigin(1, 0).setName('distanceText');
    
    this.updateUI();
  }
  
  private startIntroSequence() {
    // TODO: Show Grayson, Ceci, Ebo getting in van
    // For now, just start driving after 1 second
    this.time.delayedCall(1000, () => {
      this.gamePhase = 'toStarbucks1';
    });
  }
  
  private updateDriving(dt: number) {
    // Lane switching
    if (!this.isChangingLane) {
      if (Phaser.Input.Keyboard.JustDown(this.controls.left) && this.currentLane > 0) {
        this.changeLane(-1);
      } else if (Phaser.Input.Keyboard.JustDown(this.controls.right) && this.currentLane < 2) {
        this.changeLane(1);
      }
    }
    
    // Scroll road
    this.roadOffset += this.roadSpeed * dt / 1000;
    this.distanceTraveled += this.roadSpeed * dt / 1000;
    
    // Update lane markers animation
    this.updateLaneMarkers();
  }
  
  private changeLane(direction: number) {
    this.currentLane += direction;
    this.isChangingLane = true;
    
    this.tweens.add({
      targets: this.van,
      x: this.getLaneX(this.currentLane),
      duration: 200,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.isChangingLane = false;
      }
    });
  }
  
  private updateTraffic(dt: number) {
    // Spawn traffic cars
    this.carSpawnTimer += dt;
    if (this.carSpawnTimer >= this.carSpawnInterval) {
      this.carSpawnTimer = 0;
      this.spawnTrafficCar();
    }
    
    // Move traffic cars down (they approach the player)
    // Use reverse iteration to safely remove items
    for (let i = this.trafficCars.length - 1; i >= 0; i--) {
      const car = this.trafficCars[i];
      
      // Cars approach at different speeds (relative to player)
      car.y += (this.roadSpeed - car.speed) * dt / 1000;
      this.updateCarPosition(car);
      
      // Remove if past screen
      if (car.y > this.roadBottomY + 20) {
        car.container.destroy();
        this.trafficCars.splice(i, 1);
        continue;
      }
      
      // Check collision with player van
      if (this.checkCarCollision(car)) {
        this.hitCar();
      }
    }
  }
  
  private spawnTrafficCar() {
    const lane = Math.floor(Math.random() * 3);
    const speed = 50 + Math.random() * 30; // 50-80 speed (how fast they approach)
    
    // Create car container
    const container = this.add.container(0, 0);
    container.setDepth(5);
    
    // Car body
    const body = this.add.rectangle(0, 0, 16, 28, this.getRandomCarColor());
    const windshield = this.add.rectangle(0, -6, 12, 8, 0x87CEEB);
    
    container.add([body, windshield]);
    
    // Start at horizon
    const carY = this.horizonY + 10;
    
    this.trafficCars.push({ container, lane, speed, y: carY });
    this.updateCarPosition(this.trafficCars[this.trafficCars.length - 1]);
  }
  
  private updateCarPosition(car: { container: Phaser.GameObjects.Container, lane: number, y: number }) {
    // Calculate perspective factor (0 at horizon, 1 at bottom)
    const t = (car.y - this.horizonY) / (this.roadBottomY - this.horizonY);
    
    // Scale based on distance (smaller at horizon, larger at bottom)
    const scale = 0.2 + t * 0.8; // 0.2 to 1.0
    car.container.setScale(scale);
    
    // Get lane X position at this Y
    const roadWidth = this.roadTopWidth + (this.roadBottomWidth - this.roadTopWidth) * t;
    const roadLeft = 160 - roadWidth / 2;
    const lanePositions = [1/6, 3/6, 5/6];
    const x = roadLeft + roadWidth * lanePositions[car.lane];
    
    car.container.setPosition(x, car.y);
    
    // Depth based on Y (further back = lower depth)
    car.container.setDepth(3 + Math.floor(t * 5));
  }
  
  private getRandomCarColor(): number {
    const colors = [0x0000ff, 0xff0000, 0xffffff, 0x000000, 0xffff00, 0x808080];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  private checkCarCollision(car: { container: Phaser.GameObjects.Container, lane: number, y: number }): boolean {
    // Simple collision: same lane and overlapping Y
    if (car.lane !== this.currentLane) return false;
    
    const distance = Math.abs(car.y - this.vanY);
    return distance < 25;
  }
  
  private hitCar() {
    // Increase rage when hitting car
    this.rageLevel = Math.min(100, this.rageLevel + 15);
    
    // Flash effect
    this.cameras.main.flash(200, 255, 0, 0, false);
  }
  
  private updateClock(dt: number) {
    // Time passes (1 real second = 5 game seconds)
    this.currentTime += dt / 1000 * 5;
  }
  
  private updateRage(dt: number) {
    // Rage increases when stuck behind slow cars
    const carAhead = this.trafficCars.find(car => 
      car.lane === this.currentLane && 
      car.y > this.vanY - 40 && 
      car.y < this.vanY
    );
    
    if (carAhead && carAhead.speed < this.roadSpeed) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 500) {
        this.rageLevel = Math.min(100, this.rageLevel + dt / 1000 * 2);
      }
    } else {
      this.stuckTimer = 0;
      // Slowly decrease rage when driving smoothly
      this.rageLevel = Math.max(0, this.rageLevel - dt / 1000 * 0.5);
    }
  }
  
  private checkCheckpoints() {
    if (this.gamePhase === 'toStarbucks1' && this.distanceTraveled >= this.starbucks1Distance) {
      this.arriveAtStarbucks1();
    } else if (this.gamePhase === 'toStarbucks2' && this.distanceTraveled >= this.starbucks2Distance) {
      this.arriveAtStarbucks2();
    } else if (this.gamePhase === 'toTrailhead' && this.distanceTraveled >= this.trailheadDistance) {
      this.arriveAtTrailhead();
    }
  }
  
  private checkGameOver() {
    // Lose if rage maxes out
    if (this.rageLevel >= 100) {
      this.loseByRage();
    }
    
    // Lose if time reaches 8:00 AM
    if (this.currentTime >= 8 * 60) {
      this.loseByTime();
    }
  }
  
  private arriveAtStarbucks1() {
    this.gamePhase = 'atStarbucks1';
    this.trafficCars.forEach(car => car.container.destroy());
    this.trafficCars = [];
    
    // Wrong Starbucks dialogue
    this.time.delayedCall(500, () => {
      this.add.text(160, 60, "STARBUCKS", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#00704a",
        fontStyle: "bold"
      }).setOrigin(0.5).setDepth(50);
      
      this.time.delayedCall(1000, () => {
        this.add.text(160, 100, "Ceci: Wait... wrong one!\nI ordered at the OTHER Starbucks!", {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#ffffff",
          backgroundColor: "#000000",
          padding: { x: 8, y: 4 },
          align: "center"
        }).setOrigin(0.5).setDepth(50);
        
        // Increase rage
        this.rageLevel = Math.min(100, this.rageLevel + 10);
        
        // Continue to correct Starbucks
        this.time.delayedCall(3000, () => {
          this.gamePhase = 'toStarbucks2';
        });
      });
    });
  }
  
  private arriveAtStarbucks2() {
    this.gamePhase = 'atStarbucks2';
    this.trafficCars.forEach(car => car.container.destroy());
    this.trafficCars = [];
    
    // Correct Starbucks - get coffee
    this.time.delayedCall(500, () => {
      this.add.text(160, 60, "STARBUCKS", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#00704a",
        fontStyle: "bold"
      }).setOrigin(0.5).setDepth(50);
      
      this.time.delayedCall(1000, () => {
        this.add.text(160, 100, "Ceci: Finally! Got my coffee!", {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#ffffff",
          backgroundColor: "#000000",
          padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(50);
        
        // Continue to trailhead
        this.time.delayedCall(2000, () => {
          this.gamePhase = 'toTrailhead';
          // Traffic gets heavier (spawn faster)
          this.carSpawnInterval = 1500;
        });
      });
    });
  }
  
  private arriveAtTrailhead() {
    this.gamePhase = 'won';
    this.trafficCars.forEach(car => car.container.destroy());
    this.trafficCars = [];
    
    // Check if made it before 8 AM
    if (this.currentTime < 8 * 60) {
      this.winGame();
    } else {
      this.loseByTime();
    }
  }
  
  private winGame() {
    // Victory!
    this.add.text(160, 60, "TRAILHEAD", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#22c55e",
      fontStyle: "bold"
    }).setOrigin(0.5).setDepth(50);
    
    this.time.delayedCall(1000, () => {
      this.add.text(160, 90, "Made it before 8 AM!", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5).setDepth(50);
      
      // Spawn memory card piece
      this.time.delayedCall(1500, () => {
        this.spawnCardPiece();
      });
    });
  }
  
  private spawnCardPiece() {
    this.cardPiece = createCardPieceSprite(this, 160, 130);
    this.cardPiece.setDepth(60);
    spawnCardPieceSparkles(this, 160, 130);
    
    // Pulse animation
    this.tweens.add({
      targets: this.cardPiece,
      scale: 1.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }
  
  private checkCardCollection() {
    if (!this.cardPiece) return;
    
    // Click or press E to collect
    if (Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
      this.cardPiece.destroy();
      this.cardPiece = null;
      
      // Transition to next level
      this.time.delayedCall(500, () => {
        this.gameState.completeLevel(VOID_LEVELS.AFTER_SEATTLE_TRAFFIC);
        fadeToScene(this, SCENES.GAME, 1000);
      });
    }
  }
  
  private loseByRage() {
    this.gamePhase = 'lost';
    
    this.add.text(160, 90, "TOO MUCH TRAFFIC!\n\nGrayson: I can't deal with this...", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 8, y: 4 },
      align: "center"
    }).setOrigin(0.5).setDepth(50);
    
    this.time.delayedCall(3000, () => {
      this.scene.restart();
    });
  }
  
  private loseByTime() {
    this.gamePhase = 'lost';
    
    this.add.text(160, 90, "TOO LATE!\n\nCeci: The trail's gonna be packed now...", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 8, y: 4 },
      align: "center"
    }).setOrigin(0.5).setDepth(50);
    
    this.time.delayedCall(3000, () => {
      this.scene.restart();
    });
  }
  
  private updateUI() {
    // Update clock
    const hours = Math.floor(this.currentTime / 60);
    const minutes = Math.floor(this.currentTime % 60);
    const clockText = this.children.getByName('clockText') as Phaser.GameObjects.Text;
    if (clockText) {
      clockText.setText(`${hours}:${minutes.toString().padStart(2, '0')} AM`);
    }
    
    // Update rage meter
    const rageMeter = this.children.getByName('rageMeter') as Phaser.GameObjects.Rectangle;
    if (rageMeter) {
      rageMeter.width = (this.rageLevel / 100) * 198; // Max 198px
    }
    
    // Update distance
    const distanceText = this.children.getByName('distanceText') as Phaser.GameObjects.Text;
    if (distanceText) {
      let target = "";
      let remaining = 0;
      
      if (this.gamePhase === 'toStarbucks1') {
        target = "Coffee Shop 1";
        remaining = this.starbucks1Distance - this.distanceTraveled;
      } else if (this.gamePhase === 'toStarbucks2') {
        target = "Coffee Shop 2";
        remaining = this.starbucks2Distance - this.distanceTraveled;
      } else if (this.gamePhase === 'toTrailhead') {
        target = "Trailhead";
        remaining = this.trailheadDistance - this.distanceTraveled;
      }
      
      distanceText.setText(`→ ${target}: ${Math.max(0, Math.floor(remaining))}m`);
    }
  }
  
  shutdown() {
    // Remove keyboard listener to prevent it from firing after scene restart
    if (this.skipHandler && this.input.keyboard) {
      this.input.keyboard.off('keydown-ENTER', this.skipHandler);
    }
  }
}

