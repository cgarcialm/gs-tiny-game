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
  private roadCenterX = 160; // Center at bottom
  private horizonCenterX = 100; // Center at horizon (shifted left for curve)
  
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
    // Night sky gradient (dark blue to purple at horizon)
    const skyGraphics = this.add.graphics();
    skyGraphics.setDepth(0);
    
    // Draw gradient sky manually with rectangles
    for (let y = 0; y < this.horizonY; y++) {
      const t = y / this.horizonY;
      // From dark blue (top) to purple-pink (horizon)
      const r = Math.floor(10 + t * 40);
      const g = Math.floor(15 + t * 20);
      const b = Math.floor(35 + t * 45);
      skyGraphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      skyGraphics.fillRect(0, y, 320, 1);
    }
    
    // Stars
    for (let i = 0; i < 30; i++) {
      const starX = Math.random() * 320;
      const starY = Math.random() * (this.horizonY - 10);
      const starSize = Math.random() < 0.3 ? 2 : 1;
      const alpha = 0.4 + Math.random() * 0.6;
      skyGraphics.fillStyle(0xffffff, alpha);
      skyGraphics.fillRect(starX, starY, starSize, starSize);
    }
    
    // Mountains silhouette (Mt. Rainier style on right)
    this.drawMountains(skyGraphics);
    
    // Seattle skyline
    this.drawSeattleSkyline(skyGraphics);
    
    // Ground/grass on sides (darker for night)
    const ground = this.add.rectangle(160, (this.horizonY + this.roadBottomY) / 2, 320, this.roadBottomY - this.horizonY, 0x1a2a1a);
    ground.setDepth(0);
    
    // Draw curved perspective road
    const roadGraphics = this.add.graphics();
    roadGraphics.setDepth(1);
    
    // Draw road as filled polygon following curve
    roadGraphics.fillStyle(0x2a2a2a, 1);
    roadGraphics.beginPath();
    
    // Start at bottom-left
    roadGraphics.moveTo(this.roadCenterX - this.roadBottomWidth / 2, this.roadBottomY);
    
    // Draw left edge going up (curved)
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0 at bottom, 1 at top
      const pos = this.getRoadPosition(t);
      roadGraphics.lineTo(pos.left, pos.y);
    }
    
    // Draw right edge going down (curved)
    for (let i = segments; i >= 0; i--) {
      const t = i / segments;
      const pos = this.getRoadPosition(t);
      roadGraphics.lineTo(pos.right, pos.y);
    }
    
    roadGraphics.closePath();
    roadGraphics.fillPath();
    
    // Road edges (white lines) - draw as curves
    roadGraphics.lineStyle(2, 0xffffff, 0.8);
    
    // Left edge
    roadGraphics.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pos = this.getRoadPosition(t);
      if (i === 0) roadGraphics.moveTo(pos.left, pos.y);
      else roadGraphics.lineTo(pos.left, pos.y);
    }
    roadGraphics.strokePath();
    
    // Right edge
    roadGraphics.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pos = this.getRoadPosition(t);
      if (i === 0) roadGraphics.moveTo(pos.right, pos.y);
      else roadGraphics.lineTo(pos.right, pos.y);
    }
    roadGraphics.strokePath();
    
    // Create lane dividers (will be animated)
    this.createLaneMarkers();
  }
  
  // Get road position at a given t (0 = bottom, 1 = top/horizon)
  private getRoadPosition(t: number): { y: number, centerX: number, width: number, left: number, right: number } {
    // Use easing for more natural curve (ease-in curve to the left)
    const curveT = Math.pow(t, 1.5); // Curve accelerates toward horizon
    
    const y = this.roadBottomY - t * (this.roadBottomY - this.horizonY);
    const centerX = this.roadCenterX + curveT * (this.horizonCenterX - this.roadCenterX);
    const width = this.roadBottomWidth - t * (this.roadBottomWidth - this.roadTopWidth);
    
    return {
      y,
      centerX,
      width,
      left: centerX - width / 2,
      right: centerX + width / 2
    };
  }
  
  private drawMountains(graphics: Phaser.GameObjects.Graphics) {
    // Mt. Rainier silhouette on the right
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.beginPath();
    graphics.moveTo(220, this.horizonY);
    graphics.lineTo(260, this.horizonY - 25);
    graphics.lineTo(280, this.horizonY - 20);
    graphics.lineTo(300, this.horizonY - 28);
    graphics.lineTo(320, this.horizonY - 15);
    graphics.lineTo(320, this.horizonY);
    graphics.closePath();
    graphics.fillPath();
    
    // Snow cap
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.beginPath();
    graphics.moveTo(255, this.horizonY - 22);
    graphics.lineTo(260, this.horizonY - 25);
    graphics.lineTo(265, this.horizonY - 22);
    graphics.closePath();
    graphics.fillPath();
  }
  
  private drawSeattleSkyline(graphics: Phaser.GameObjects.Graphics) {
    const skylineY = this.horizonY;
    
    // Building silhouettes (dark)
    graphics.fillStyle(0x151520, 1);
    
    // Left side buildings
    graphics.fillRect(0, skylineY - 12, 15, 12);
    graphics.fillRect(18, skylineY - 18, 12, 18);
    graphics.fillRect(32, skylineY - 10, 10, 10);
    graphics.fillRect(44, skylineY - 22, 14, 22);
    graphics.fillRect(60, skylineY - 15, 10, 15);
    
    // Space Needle! (center-left)
    this.drawSpaceNeedle(graphics, 85, skylineY);
    
    // More buildings
    graphics.fillStyle(0x151520, 1);
    graphics.fillRect(100, skylineY - 20, 12, 20);
    graphics.fillRect(115, skylineY - 28, 15, 28);
    graphics.fillRect(132, skylineY - 16, 10, 16);
    
    // Columbia Center (tallest, right of center)
    graphics.fillRect(145, skylineY - 32, 14, 32);
    
    // Right side buildings
    graphics.fillRect(162, skylineY - 18, 12, 18);
    graphics.fillRect(176, skylineY - 14, 10, 14);
    graphics.fillRect(188, skylineY - 20, 14, 20);
    graphics.fillRect(205, skylineY - 12, 12, 12);
    
    // Add lit windows to buildings
    this.addBuildingLights(graphics, skylineY);
  }
  
  private drawSpaceNeedle(graphics: Phaser.GameObjects.Graphics, x: number, baseY: number) {
    // Space Needle silhouette
    graphics.fillStyle(0x202030, 1);
    
    // Base/legs
    graphics.fillTriangle(x - 6, baseY, x + 6, baseY, x, baseY - 8);
    
    // Shaft
    graphics.fillRect(x - 1, baseY - 30, 2, 22);
    
    // Observation deck
    graphics.fillRect(x - 8, baseY - 32, 16, 3);
    
    // Top spire
    graphics.fillRect(x, baseY - 38, 1, 6);
    
    // Observation deck lights (red beacon)
    graphics.fillStyle(0xff3333, 0.8);
    graphics.fillCircle(x, baseY - 38, 1);
    
    // Restaurant ring lights
    graphics.fillStyle(0xffffaa, 0.6);
    graphics.fillRect(x - 6, baseY - 31, 2, 1);
    graphics.fillRect(x + 4, baseY - 31, 2, 1);
  }
  
  private addBuildingLights(graphics: Phaser.GameObjects.Graphics, skylineY: number) {
    // Random lit windows
    const buildings = [
      { x: 0, w: 15, h: 12 },
      { x: 18, w: 12, h: 18 },
      { x: 44, w: 14, h: 22 },
      { x: 100, w: 12, h: 20 },
      { x: 115, w: 15, h: 28 },
      { x: 145, w: 14, h: 32 },
      { x: 162, w: 12, h: 18 },
      { x: 188, w: 14, h: 20 },
    ];
    
    buildings.forEach(b => {
      const windowRows = Math.floor(b.h / 4);
      const windowCols = Math.floor(b.w / 4);
      
      for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
          if (Math.random() > 0.6) { // 40% chance of lit window
            const wx = b.x + 2 + col * 4;
            const wy = skylineY - b.h + 2 + row * 4;
            // Warm yellow/orange window light
            const color = Math.random() > 0.3 ? 0xffdd88 : 0xffaa55;
            graphics.fillStyle(color, 0.7);
            graphics.fillRect(wx, wy, 2, 2);
          }
        }
      }
    });
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
      
      // Calculate t (0 at bottom, 1 at top) for road position
      const t = 1 - (baseY - this.horizonY) / (this.roadBottomY - this.horizonY);
      const pos = this.getRoadPosition(t);
      
      // Lane divider X position (1/3 and 2/3 across the road)
      const laneX = pos.left + pos.width * (lane + 1) / 3;
      
      // Marker length scales with perspective (smaller at top)
      const markerLength = 3 + (1 - t) * 8;
      const markerWidth = 1 + (1 - t) * 2;
      
      // Draw yellow dashed line
      marker.fillStyle(0xffff00, 1);
      marker.fillRect(laneX - markerWidth / 2, baseY, markerWidth, markerLength);
    });
  }
  
  // Get X position for a lane at a given Y position
  private getLaneX(lane: number, y: number = this.vanY): number {
    const t = 1 - (y - this.horizonY) / (this.roadBottomY - this.horizonY);
    const pos = this.getRoadPosition(t);
    
    // Lanes are at 1/6, 3/6, 5/6 of the road width (center of each lane)
    const lanePositions = [1/6, 3/6, 5/6];
    return pos.left + pos.width * lanePositions[lane];
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
    
    // Get lane X position at this Y (follows the curve)
    const x = this.getLaneX(car.lane, car.y);
    
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

