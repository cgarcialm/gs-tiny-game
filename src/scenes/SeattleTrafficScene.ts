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
  private lanePositions = [65, 160, 255]; // X positions for each lane
  private isChangingLane = false;
  
  // Road scrolling
  private roadSpeed = 100; // Base scrolling speed
  private roadOffset = 0;
  
  // Traffic cars
  private trafficCars: { sprite: Phaser.GameObjects.Rectangle, lane: number, speed: number }[] = [];
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
    // Road background (dark gray)
    const road = this.add.rectangle(160, 90, 280, 180, 0x333333);
    road.setDepth(0);
    
    // Lane markers (will be animated)
    // TODO: Add scrolling lane markers
  }
  
  private createVan() {
    // Burgundy van at bottom of screen
    this.van = this.add.container(this.lanePositions[1], 140);
    this.van.setDepth(10);
    
    // Simple van sprite (burgundy rectangle)
    const body = this.add.rectangle(0, 0, 12, 20, 0x8B0000); // Burgundy
    const windshield = this.add.rectangle(0, -5, 10, 6, 0x87CEEB); // Light blue
    const wheels = this.add.graphics();
    wheels.fillStyle(0x000000, 1);
    wheels.fillRect(-6, 7, 3, 4); // Left wheel
    wheels.fillRect(3, 7, 3, 4); // Right wheel
    
    this.van.add([body, windshield, wheels]);
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
  }
  
  private changeLane(direction: number) {
    this.currentLane += direction;
    this.isChangingLane = true;
    
    this.tweens.add({
      targets: this.van,
      x: this.lanePositions[this.currentLane],
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
    
    // Move traffic cars down (they move slower than road)
    this.trafficCars.forEach((car, index) => {
      car.sprite.y += (this.roadSpeed - car.speed) * dt / 1000;
      
      // Remove if off screen
      if (car.sprite.y > 200) {
        car.sprite.destroy();
        this.trafficCars.splice(index, 1);
      }
      
      // Check collision with player van
      if (this.checkCarCollision(car)) {
        this.hitCar();
      }
    });
  }
  
  private spawnTrafficCar() {
    const lane = Math.floor(Math.random() * 3);
    const speed = 50 + Math.random() * 30; // 50-80 speed
    
    const car = this.add.rectangle(this.lanePositions[lane], -20, 10, 18, this.getRandomCarColor());
    car.setDepth(5);
    
    this.trafficCars.push({ sprite: car, lane, speed });
  }
  
  private getRandomCarColor(): number {
    const colors = [0x0000ff, 0xff0000, 0xffffff, 0x000000, 0xffff00, 0x808080];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  private checkCarCollision(car: { sprite: Phaser.GameObjects.Rectangle, lane: number }): boolean {
    // Simple collision: same lane and overlapping Y
    if (car.lane !== this.currentLane) return false;
    
    const distance = Math.abs(car.sprite.y - this.van.y);
    return distance < 20;
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
      car.sprite.y > this.van.y - 40 && 
      car.sprite.y < this.van.y
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
    this.trafficCars.forEach(car => car.sprite.destroy());
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
    this.trafficCars.forEach(car => car.sprite.destroy());
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
    this.trafficCars.forEach(car => car.sprite.destroy());
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

