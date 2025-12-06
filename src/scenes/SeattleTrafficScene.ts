import Phaser from "phaser";
import { initializeGameScene } from "../utils/sceneSetup";
import { fadeToScene } from "../utils/sceneTransitions";
import { handleMenuInput } from "../utils/menuHandler";
import { GameStateManager } from "../managers/GameStateManager";
import { SCENES, VOID_LEVELS } from "../config/sceneConstants";
import { HELP_HINT_X, HELP_HINT_Y } from "../utils/controls";
import { HELP_HINT_TEXT_STYLE } from "../config/textStyles";
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
  private vanY = 140; // Van's Y position (near bottom)
  private roadCenterX = 160; // Center at bottom
  private horizonCenterX = 80; // Center at horizon (shifted left for curve)
  
  // Road scrolling
  private roadSpeed = 100; // Current scrolling speed (changes with lane)
  private roadOffset = 0;
  private laneMarkers: Phaser.GameObjects.Graphics[] = [];
  
  // Lane speed rules: left=fast, middle=medium, right=slow
  private laneSpeeds = [150, 100, 50]; // Lane 0 (left), 1 (middle), 2 (right)
  
  // Traffic cars
  private trafficCars: { container: Phaser.GameObjects.Container, lane: number, speed: number, y: number, exiting?: boolean }[] = [];
  private carSpawnTimer = 0;
  private carSpawnInterval = 2000; // Spawn every 2 seconds
  
  // On-ramps and off-ramps (every 5 game minutes = 20 real seconds at 15x)
  private lastRampTime = 7 * 60 + 10; // Start time (5 min before game start so first ramps appear at 7:15)
  private rampInterval = 5; // Every 5 game minutes (20 real seconds at 15x)
  private activeRamps: { graphics: Phaser.GameObjects.Graphics, y: number, type: 'on' | 'off', label: Phaser.GameObjects.Text }[] = []
  
  // Game state
  private gamePhase: 'intro' | 'toStarbucks1' | 'toStarbucks2' | 'toTrailhead' | 'won' | 'lost' = 'intro';
  private distanceTraveled = 0;
  private currentTime = 7 * 60 + 15; // 7:15 AM in minutes
  private rageLevel = 0; // 0-100
  private stuckTimer = 0;
  
  // Checkpoints - tuned for 3 real minutes (45 game minutes at 15x speed)
  // At avg speed 100: 180 seconds = 18000 units total
  private starbucks1Distance = 5833;   // 1/3 of total distance (~20 miles)
  private starbucks2Distance = 11667;  // 2/3 of total distance (~40 miles)
  private trailheadDistance = 17500;   // Full distance to trailhead (~60 miles)
  private unitsPerMile = 291.67;       // Conversion: 17500 units = 60 miles
  
  // Speech bubble container
  private speechBubble?: Phaser.GameObjects.Container;

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
    this.roadSpeed = this.laneSpeeds[this.currentLane]; // Set initial speed based on lane
    this.lastRampTime = 7 * 60 + 10; // Reset ramp timing (5 min before start)
    this.activeRamps = []; // Clear any leftover ramps
    
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
      return;
    }
    
    // Active gameplay phases
    if (this.gamePhase.startsWith('to')) {
      this.updateDriving(dt);
      this.updateTraffic(dt);
      this.updateClock(dt);
      this.updateRage(dt);
      this.checkRamps();
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
    
    // Ground - grass on left side (darker for night)
    const grassLeft = this.add.rectangle(40, (this.horizonY + this.roadBottomY) / 2, 80, this.roadBottomY - this.horizonY, 0x1a2a1a);
    grassLeft.setDepth(0);
    
    // Middle section (between road edges) - draw first so water overlays it
    const middleGround = this.add.rectangle(160, (this.horizonY + this.roadBottomY) / 2, 160, this.roadBottomY - this.horizonY, 0x1a2a1a);
    middleGround.setDepth(0);
    
    // Water on right side (dark blue, Puget Sound) - follows right edge of road
    const waterGraphics = this.add.graphics();
    waterGraphics.setDepth(0.5);
    waterGraphics.fillStyle(0x0a1a2a, 1); // Dark blue water
    
    // Draw water as polygon following road's right edge
    waterGraphics.beginPath();
    // Start at horizon, right edge of road
    const horizonRoadPos = this.getRoadPosition(1); // t=1 is horizon
    waterGraphics.moveTo(horizonRoadPos.right, this.horizonY);
    // Go to top-right corner
    waterGraphics.lineTo(320, this.horizonY);
    // Go to bottom-right corner
    waterGraphics.lineTo(320, this.roadBottomY);
    // Follow road's right edge back up
    const waterSegments = 10;
    for (let i = 0; i <= waterSegments; i++) {
      const t = i / waterSegments; // 0 at bottom, 1 at top
      const pos = this.getRoadPosition(t);
      waterGraphics.lineTo(pos.right, pos.y);
    }
    waterGraphics.closePath();
    waterGraphics.fillPath();
    
    // Water reflections/shimmer
    waterGraphics.fillStyle(0x1a3a5a, 0.3);
    for (let i = 0; i < 8; i++) {
      const t = (i + 1) / 10;
      const pos = this.getRoadPosition(t);
      const wy = pos.y;
      const ww = 15 + Math.random() * 30;
      const wx = pos.right + 10 + Math.random() * (320 - pos.right - 20);
      if (wx + ww < 320) {
        waterGraphics.fillRect(wx, wy, ww, 2);
      }
    }
    
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
    // Mt. Rainier silhouette - shorter and wider, at far right of screen
    const offsetX = 20; // Same offset as skyline
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.beginPath();
    graphics.moveTo(Math.min(250 + offsetX, 320), this.horizonY);
    graphics.lineTo(Math.min(265 + offsetX, 320), this.horizonY - 6);
    graphics.lineTo(Math.min(285 + offsetX, 320), this.horizonY - 14);
    graphics.lineTo(Math.min(305 + offsetX, 320), this.horizonY - 12);
    graphics.lineTo(320, this.horizonY - 8);
    graphics.lineTo(320, this.horizonY);
    graphics.closePath();
    graphics.fillPath();
    
    // Snow cap on Rainier (wider)
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.beginPath();
    graphics.moveTo(Math.min(278 + offsetX, 320), this.horizonY - 10);
    graphics.lineTo(Math.min(285 + offsetX, 320), this.horizonY - 14);
    graphics.lineTo(Math.min(295 + offsetX, 320), this.horizonY - 11);
    graphics.closePath();
    graphics.fillPath();
  }
  
  private drawSeattleSkyline(graphics: Phaser.GameObjects.Graphics) {
    const skylineY = this.horizonY;
    const offsetX = 20; // Shift everything right
    
    // Building silhouettes (dark) - left to right: many buildings, space needle, 2 small buildings, mt rainier
    graphics.fillStyle(0x151520, 1);
    
    // Small houses/short buildings on far left
    graphics.fillRect(0, skylineY - 6, 6, 6);
    graphics.fillRect(8, skylineY - 8, 7, 8);
    graphics.fillRect(17, skylineY - 5, 5, 5);
    graphics.fillRect(24, skylineY - 9, 8, 9);
    graphics.fillRect(34, skylineY - 6, 6, 6);
    graphics.fillRect(42, skylineY - 10, 7, 10);
    graphics.fillRect(51, skylineY - 7, 6, 7);
    
    // Many buildings on the left
    graphics.fillRect(40 + offsetX, skylineY - 14, 8, 14);
    graphics.fillRect(50 + offsetX, skylineY - 20, 10, 20);
    graphics.fillRect(62 + offsetX, skylineY - 16, 8, 16);
    graphics.fillRect(72 + offsetX, skylineY - 24, 12, 24);
    graphics.fillRect(86 + offsetX, skylineY - 18, 10, 18);
    
    // Columbia Center (tallest)
    graphics.fillRect(98 + offsetX, skylineY - 30, 12, 30);
    
    graphics.fillRect(112 + offsetX, skylineY - 20, 10, 20);
    graphics.fillRect(124 + offsetX, skylineY - 16, 10, 16);
    graphics.fillRect(136 + offsetX, skylineY - 22, 10, 22);
    graphics.fillRect(148 + offsetX, skylineY - 14, 8, 14);
    graphics.fillRect(158 + offsetX, skylineY - 18, 10, 18);
    graphics.fillRect(170 + offsetX, skylineY - 12, 8, 12);
    
    // Space Needle! (moved right)
    this.drawSpaceNeedle(graphics, 190 + offsetX, skylineY);
    
    // Two smaller buildings after Space Needle
    graphics.fillStyle(0x151520, 1);
    graphics.fillRect(207 + offsetX, skylineY - 12, 10, 12);
    graphics.fillRect(220 + offsetX, skylineY - 8, 8, 8);
    
    // Add lit windows to buildings
    this.addBuildingLights(graphics, skylineY);
  }
  
  private drawSpaceNeedle(graphics: Phaser.GameObjects.Graphics, x: number, baseY: number) {
    // Space Needle silhouette (slightly smaller)
    graphics.fillStyle(0x202030, 1);
    
    // Base/legs
    graphics.fillTriangle(x - 5, baseY, x + 5, baseY, x, baseY - 6);
    
    // Shaft
    graphics.fillRect(x - 1, baseY - 24, 2, 18);
    
    // Observation deck - diamond/rhombus shape
    graphics.beginPath();
    graphics.moveTo(x - 7, baseY - 25); // Left point
    graphics.lineTo(x, baseY - 27); // Top point
    graphics.lineTo(x + 7, baseY - 25); // Right point
    graphics.lineTo(x, baseY - 23); // Bottom point
    graphics.closePath();
    graphics.fillPath();
    
    // Top spire
    graphics.fillRect(x, baseY - 32, 1, 5);
    
    // Observation deck lights (red beacon)
    graphics.fillStyle(0xff3333, 0.8);
    graphics.fillCircle(x, baseY - 32, 1);
    
    // Restaurant ring lights
    graphics.fillStyle(0xffffaa, 0.6);
    graphics.fillRect(x - 5, baseY - 25, 2, 1);
    graphics.fillRect(x + 3, baseY - 25, 2, 1);
  }
  
  private addBuildingLights(graphics: Phaser.GameObjects.Graphics, skylineY: number) {
    // Random lit windows - buildings aligned with highway horizon
    const offsetX = 20; // Same offset as skyline
    const buildings = [
      // Small houses on far left
      { x: 8, w: 7, h: 8 },
      { x: 24, w: 8, h: 9 },
      { x: 42, w: 7, h: 10 },
      // Taller buildings
      { x: 40 + offsetX, w: 8, h: 14 },
      { x: 50 + offsetX, w: 10, h: 20 },
      { x: 62 + offsetX, w: 8, h: 16 },
      { x: 72 + offsetX, w: 12, h: 24 },
      { x: 86 + offsetX, w: 10, h: 18 },
      { x: 98 + offsetX, w: 12, h: 30 },
      { x: 112 + offsetX, w: 10, h: 20 },
      { x: 124 + offsetX, w: 10, h: 16 },
      { x: 136 + offsetX, w: 10, h: 22 },
      { x: 148 + offsetX, w: 8, h: 14 },
      { x: 158 + offsetX, w: 10, h: 18 },
      { x: 170 + offsetX, w: 8, h: 12 },
      { x: 207 + offsetX, w: 10, h: 12 },
      { x: 220 + offsetX, w: 8, h: 8 },
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
    
    // Rage meter (bottom) - edit these variables to adjust positioning
    const rageBarX =35;      // X position where bar starts (after RAGE text)
    const rageBarY = 170;     // Y position of the bar
    const rageBarWidth = 220; // Total width of the bar
    const rageBarHeight = 8;  // Height of background bar
    const rageMeterHeight = rageBarHeight - 2; // Height of red fill
    
    this.add.rectangle(rageBarX + rageBarWidth / 2, rageBarY, rageBarWidth, rageBarHeight, 0x111111).setDepth(100); // Background bar
    this.add.rectangle(rageBarX, rageBarY, 0, rageMeterHeight, 0xff0000).setDepth(101).setName('rageMeter').setOrigin(0, 0.5); // Red fill
    // Semi-transparent background for RAGE text
    this.add.rectangle(22, rageBarY + 1, 28, 12, 0x000000, 0.5).setDepth(101);
    this.add.text(10, rageBarY + 1, "RAGE", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ff0000"
    }).setDepth(102).setOrigin(0, 0.5);
    
    // Store bar width for update function
    this.registry.set('rageBarWidth', rageBarWidth);
    
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
    
    // Smoothly transition to new lane speed
    const newSpeed = this.laneSpeeds[this.currentLane];
    this.tweens.add({
      targets: this,
      roadSpeed: newSpeed,
      duration: 300,
      ease: "Sine.easeInOut"
    });
    
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
      
      // Handle exiting cars - they drift to the right
      if (car.exiting) {
        car.container.x += 50 * dt / 1000; // Drift right
        
        // Remove if off-screen to the right
        if (car.container.x > 340) {
          car.container.destroy();
          this.trafficCars.splice(i, 1);
          continue;
        }
      } else {
        this.updateCarPosition(car);
      }
      
      // Remove if past screen (bottom) or near horizon (cars that pulled ahead)
      if (car.y > this.roadBottomY + 20 || car.y < this.horizonY + 8) {
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
    
    // Cars match their lane speed (with small variation)
    const baseLaneSpeed = this.laneSpeeds[lane];
    const speed = baseLaneSpeed + (Math.random() * 20 - 10); // ±10 variation
    
    // Create car container
    const container = this.add.container(0, 0);
    container.setDepth(5);
    
    // Car body
    const body = this.add.rectangle(0, 0, 16, 28, this.getRandomCarColor());
    const windshield = this.add.rectangle(0, -6, 12, 8, 0x87CEEB);
    
    container.add([body, windshield]);
    
    // Spawn position relative to player's lane:
    // - Lanes to the LEFT of player: spawn from bottom, faster cars overtake toward horizon
    // - Same lane as player: spawn from top, similar speed
    // - Lanes to the RIGHT of player: spawn from top, slower cars that player catches up to
    let carY: number;
    if (lane < this.currentLane) {
      // Car is in a lane to the LEFT of player - faster, comes from behind
      carY = this.roadBottomY - 5;
    } else {
      // Same lane or lanes to the RIGHT - spawn at horizon
      carY = this.horizonY + 10;
    }
    
    this.trafficCars.push({ container, lane, speed, y: carY });
    this.updateCarPosition(this.trafficCars[this.trafficCars.length - 1]);
  }
  
  private updateCarPosition(car: { container: Phaser.GameObjects.Container, lane: number, y: number, merging?: boolean }) {
    // Calculate perspective factor (0 at horizon, 1 at bottom)
    const t = (car.y - this.horizonY) / (this.roadBottomY - this.horizonY);
    
    // Scale based on distance (smaller at horizon, larger at bottom)
    const scale = 0.2 + t * 0.8; // 0.2 to 1.0
    car.container.setScale(scale);
    
    // Skip X position update if car is merging (tween is controlling it)
    if (car.merging) {
      car.container.setY(car.y);
      return;
    }
    
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
    // Time passes at 
    this.currentTime += dt / 1000 * 45 / 60; // Convert to minutes
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
  
  private checkRamps() {
    // Update all active ramps (scroll with road)
    for (let i = this.activeRamps.length - 1; i >= 0; i--) {
      const ramp = this.activeRamps[i];
      ramp.y += this.roadSpeed * this.game.loop.delta / 1000;
      this.updateRampGraphics(ramp);
      
      // Remove ramp when it goes off screen
      if (ramp.y > this.roadBottomY + 50) {
        ramp.graphics.destroy();
        ramp.label.destroy();
        this.activeRamps.splice(i, 1);
      }
    }
    
    // Check if 5 game minutes have passed since last ramp
    if (this.currentTime >= this.lastRampTime + this.rampInterval && this.activeRamps.length === 0) {
      this.lastRampTime = this.currentTime;
      
      // Trigger EXIT first, then MERGE after a short delay (like real interchanges)
      this.triggerOffRamp();
      this.time.delayedCall(1000, () => {
        this.triggerOnRamp();
      });
    }
  }
  
  private createRampGraphics(type: 'on' | 'off') {
    const graphics = this.add.graphics();
    graphics.setDepth(1.5); // Between road and cars
    
    // Create label with arrow (realistic highway sign colors)
    // MERGE = yellow warning sign, EXIT = green guide sign
    const labelText = type === 'on' ? '<< MERGE' : 'EXIT >>';
    const label = this.add.text(0, 0, labelText, {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: type === 'on' ? '#000000' : '#ffffff',
      backgroundColor: type === 'on' ? '#ffcc00' : '#006633',
      padding: { x: 3, y: 2 }
    }).setDepth(50).setOrigin(0.5);
    
    // Ramp starts at horizon
    const ramp = { graphics, y: this.horizonY + 20, type, label };
    this.activeRamps.push(ramp);
    this.updateRampGraphics(ramp);
  }
  
  private updateRampGraphics(ramp: { graphics: Phaser.GameObjects.Graphics, y: number, type: 'on' | 'off', label: Phaser.GameObjects.Text }) {
    const { graphics, y, type, label } = ramp;
    graphics.clear();
    
    // Get road position at ramp Y
    const t = 1 - (y - this.horizonY) / (this.roadBottomY - this.horizonY);
    if (t < 0 || t > 1) {
      label.setVisible(false);
      return;
    }
    label.setVisible(true);
    
    const pos = this.getRoadPosition(t);
    
    // === RAMP CONFIGURATION - Adjust these to change ramp appearance ===
    const rampWidth = 8 + (1 - t) * 12;      // Width of the ramp road
    
    // RAMP ANGLE: Higher = more horizontal, Lower = more vertical
    // Try values between 0.5 (steep) and 3.0 (very horizontal)
    const rampAngle = 2;
    
    const baseLength = 30 + (1 - t) * 40;    // Base vertical length
    const rampLength = baseLength;            // Vertical extent
    const outerAngle = baseLength * rampAngle; // Horizontal extent (outer edge)
    const innerAngle = baseLength * rampAngle * 0.8; // Horizontal extent (inner edge)
    // ===================================================================
    
    // Draw curved ramp road
    graphics.fillStyle(0x2a2a2a, 1); // Match main road color
    
    const segments = 16; // More segments for smoother curve
    
    if (type === 'on') {
      // On-ramp: smooth curve from bottom-right merging into highway
      graphics.beginPath();
      
      // Outer edge (right side of ramp) - curves from bottom-right to merge point
      for (let i = 0; i <= segments; i++) {
        const st = i / segments;
        // Ease-in curve (starts far right, curves in to highway)
        const curve = Math.pow(st, 2);
        // Outer edge starts at road edge
        const px = pos.right + (1 - curve) * outerAngle;
        const py = y + (1 - st) * rampLength;
        if (i === 0) graphics.moveTo(px, py);
        else graphics.lineTo(px, py);
      }
      
      // Inner edge (left side of ramp) - back down, starts below outer
      for (let i = segments; i >= 0; i--) {
        const st = i / segments;
        const curve = Math.pow(st, 2);
        // Start at road edge but 10px right and 10px below outer (creates gap at connection)
        const px = pos.right + (1 - curve) * innerAngle + 10;
        const py = y + 10 + (1 - st) * rampLength;
        graphics.lineTo(px, py);
      }
      
      graphics.closePath();
      graphics.fillPath();
      
      // White edge lines on BOTH sides
      graphics.lineStyle(1, 0xffffff, 0.9);
      // Outer edge
      graphics.beginPath();
      for (let i = 0; i <= segments; i++) {
        const st = i / segments;
        const curve = Math.pow(st, 2);
        const px = pos.right + (1 - curve) * outerAngle;
        const py = y + (1 - st) * rampLength;
        if (i === 0) graphics.moveTo(px, py);
        else graphics.lineTo(px, py);
      }
      graphics.strokePath();
      // Inner edge (starts 10px below)
      graphics.beginPath();
      for (let i = 0; i <= segments; i++) {
        const st = i / segments;
        const curve = Math.pow(st, 2);
        const px = pos.right + (1 - curve) * innerAngle + 10;
        const py = y + 10 + (1 - st) * rampLength;
        if (i === 0) graphics.moveTo(px, py);
        else graphics.lineTo(px, py);
      }
      graphics.strokePath();
      
      // Yellow dashed center line - between outer and inner edges
      graphics.lineStyle(1, 0xffff00, 0.8);
      for (let i = 0; i < segments; i += 3) { // Dashed: draw every 3rd segment
        const st1 = i / segments;
        const st2 = Math.min((i + 1.5) / segments, 1);
        const curve1 = Math.pow(st1, 2);
        const curve2 = Math.pow(st2, 2);
        // Center is midway between outer and inner edges
        const outerX1 = pos.right + (1 - curve1) * outerAngle;
        const outerY1 = y + (1 - st1) * rampLength;
        const innerX1 = pos.right + (1 - curve1) * innerAngle + 10;
        const innerY1 = y + 10 + (1 - st1) * rampLength;
        const outerX2 = pos.right + (1 - curve2) * outerAngle;
        const outerY2 = y + (1 - st2) * rampLength;
        const innerX2 = pos.right + (1 - curve2) * innerAngle + 10;
        const innerY2 = y + 10 + (1 - st2) * rampLength;
        const px1 = (outerX1 + innerX1) / 2;
        const py1 = (outerY1 + innerY1) / 2;
        const px2 = (outerX2 + innerX2) / 2;
        const py2 = (outerY2 + innerY2) / 2;
        graphics.beginPath();
        graphics.moveTo(px1, py1);
        graphics.lineTo(px2, py2);
        graphics.strokePath();
      }
      
    } else {
      // Off-ramp: smooth curve from highway out to bottom-right
      graphics.beginPath();
      
      // Inner edge (left side) - from highway going out, starts below outer
      for (let i = 0; i <= segments; i++) {
        const st = i / segments;
        // Ease-out curve (starts at highway, curves out to right)
        const curve = 1 - Math.pow(1 - st, 2);
        // Start at road edge but 10px right and 10px below outer (creates gap at connection)
        const px = pos.right + curve * innerAngle + 10;
        const py = y + 10 + st * rampLength;
        if (i === 0) graphics.moveTo(px, py);
        else graphics.lineTo(px, py);
      }
      
      // Outer edge (right side) - back up, starts at road edge
      for (let i = segments; i >= 0; i--) {
        const st = i / segments;
        const curve = 1 - Math.pow(1 - st, 2);
        const px = pos.right + curve * outerAngle;
        const py = y + st * rampLength;
        graphics.lineTo(px, py);
      }
      
      graphics.closePath();
      graphics.fillPath();
      
      // White edge lines on BOTH sides
      graphics.lineStyle(1, 0xffffff, 0.9);
      // Outer edge
      graphics.beginPath();
      for (let i = 0; i <= segments; i++) {
        const st = i / segments;
        const curve = 1 - Math.pow(1 - st, 2);
        const px = pos.right + curve * outerAngle;
        const py = y + st * rampLength;
        if (i === 0) graphics.moveTo(px, py);
        else graphics.lineTo(px, py);
      }
      graphics.strokePath();
      // Inner edge
      graphics.beginPath();
      for (let i = 0; i <= segments; i++) {
        const st = i / segments;
        const curve = 1 - Math.pow(1 - st, 2);
        const px = pos.right + curve * innerAngle + 10;
        const py = y + 10 + st * rampLength;
        if (i === 0) graphics.moveTo(px, py);
        else graphics.lineTo(px, py);
      }
      graphics.strokePath();
      
      // Yellow dashed center line - between outer and inner edges
      graphics.lineStyle(1, 0xffff00, 0.8);
      for (let i = 0; i < segments; i += 3) { // Dashed: draw every 3rd segment
        const st1 = i / segments;
        const st2 = Math.min((i + 1.5) / segments, 1);
        const curve1 = 1 - Math.pow(1 - st1, 2);
        const curve2 = 1 - Math.pow(1 - st2, 2);
        // Center is midway between outer and inner edges
        const outerX1 = pos.right + curve1 * outerAngle;
        const outerY1 = y + st1 * rampLength;
        const innerX1 = pos.right + curve1 * innerAngle + 10;
        const innerY1 = y + 10 + st1 * rampLength;
        const outerX2 = pos.right + curve2 * outerAngle;
        const outerY2 = y + st2 * rampLength;
        const innerX2 = pos.right + curve2 * innerAngle + 10;
        const innerY2 = y + 10 + st2 * rampLength;
        const px1 = (outerX1 + innerX1) / 2;
        const py1 = (outerY1 + innerY1) / 2;
        const px2 = (outerX2 + innerX2) / 2;
        const py2 = (outerY2 + innerY2) / 2;
        graphics.beginPath();
        graphics.moveTo(px1, py1);
        graphics.lineTo(px2, py2);
        graphics.strokePath();
      }
    }
    
    // Update label position - on highway border, slightly ahead of ramp (lower Y = ahead)
    const labelY = type === 'on' ? y - 15 : y - 10; // Sign appears before ramp
    label.setPosition(pos.right + 5, labelY);
  }
  
  private triggerOnRamp() {
    // Create visual ramp
    this.createRampGraphics('on');
    
    // Spawn 2-3 merging cars immediately as ramp appears (faster timing)
    const numCars = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numCars; i++) {
      this.time.delayedCall(100 + i * 300, () => {
        this.spawnMergingCar();
      });
    }
  }
  
  private triggerOffRamp() {
    // Create visual ramp
    this.createRampGraphics('off');
    
    // Mark some right-lane cars as exiting after a delay
    this.time.delayedCall(1000, () => {
      const rightLaneCars = this.trafficCars.filter(car => car.lane === 2 && !car.exiting);
      const numExiting = Math.min(2, rightLaneCars.length);
      
      for (let i = 0; i < numExiting; i++) {
        if (rightLaneCars[i]) {
          rightLaneCars[i].exiting = true;
        }
      }
    });
  }
  
  private spawnMergingCar() {
    // Merging cars come from the right edge, entering the right lane
    const container = this.add.container(0, 0);
    container.setDepth(5);
    
    const body = this.add.rectangle(0, 0, 16, 28, this.getRandomCarColor());
    const windshield = this.add.rectangle(0, -6, 12, 8, 0x87CEEB);
    container.add([body, windshield]);
    
    // Spawn near the ramp position (find the on-ramp if exists)
    const onRamp = this.activeRamps.find(r => r.type === 'on');
    const rampY = onRamp ? onRamp.y : this.horizonY + 50;
    const carY = Math.max(this.horizonY + 15, Math.min(rampY + 10, this.roadBottomY - 30));
    const speed = this.laneSpeeds[2] + (Math.random() * 20 - 10); // Right lane speed
    
    const car = { container, lane: 2, speed, y: carY, exiting: false, merging: true };
    this.trafficCars.push(car);
    
    // Position off-screen to the right, slightly above target Y (coming from ramp curve)
    const pos = this.getRoadPosition(1 - (carY - this.horizonY) / (this.roadBottomY - this.horizonY));
    const startX = pos.right + 40;
    const startY = carY - 15; // Start slightly higher (coming from ramp)
    container.setPosition(startX, startY);
    
    // Calculate perspective scale
    const t = (carY - this.horizonY) / (this.roadBottomY - this.horizonY);
    container.setScale(0.2 + t * 0.8);
    
    // Fast diagonal merge animation into the right lane
    this.tweens.add({
      targets: container,
      x: this.getLaneX(2, carY),
      y: carY,
      duration: 350,
      ease: 'Sine.easeOut',
      onComplete: () => {
        car.merging = false; // Allow normal position updates after merge
      }
    });
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
    // Keep game running - just transition to next phase immediately
    this.gamePhase = 'toStarbucks2';
    
    // Wrong Starbucks dialogue (game keeps running)
    this.showSpeechBubble("Ceci", "Wait... wrong one! I ordered at the OTHER Starbucks!", 3000);
    
    // Increase rage
    this.rageLevel = Math.min(100, this.rageLevel + 10);
  }
  
  private arriveAtStarbucks2() {
    // Keep game running - just transition to next phase immediately
    this.gamePhase = 'toTrailhead';
    
    // Correct Starbucks dialogue (game keeps running)
    this.showSpeechBubble("Ceci", "Finally! Got my coffee!", 2500);
    
    // Traffic gets heavier (spawn faster)
    this.carSpawnInterval = 1500;
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
    this.showSpeechBubble("Ceci", "We made it! Let's hike!", 2500);
    
    // Transition to next level after delay
    this.time.delayedCall(3000, () => {
      this.gameState.completeLevel(VOID_LEVELS.AFTER_SEATTLE_TRAFFIC);
      fadeToScene(this, SCENES.GAME, 1000);
    });
  }
  
  private loseByRage() {
    this.gamePhase = 'lost';
    
    this.showSpeechBubble("Grayson", "I can't deal with this traffic anymore...", 2500);
    
    this.time.delayedCall(3000, () => {
      this.scene.restart();
    });
  }
  
  private loseByTime() {
    this.gamePhase = 'lost';
    
    this.showSpeechBubble("Ceci", "The trail's gonna be packed now...", 2500);
    
    this.time.delayedCall(3000, () => {
      this.scene.restart();
    });
  }
  
  private showSpeechBubble(speaker: string, text: string, duration: number = 3000) {
    // Remove existing bubble if any
    if (this.speechBubble) {
      this.speechBubble.destroy();
    }
    
    // Position over the water (right side of screen), in the sky area
    const bubbleX = 255;
    const bubbleY = 80;
    
    // Create container
    this.speechBubble = this.add.container(bubbleX, bubbleY);
    this.speechBubble.setDepth(200);
    
    // Create text first to measure it
    const fullText = `${speaker}: ${text}`;
    const messageText = this.add.text(0, 0, fullText, {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#000000",
      wordWrap: { width: 100 }
    }).setOrigin(0.5);
    
    // Calculate bubble size based on text
    const padding = 8;
    const bubbleWidth = messageText.width + padding * 2;
    const bubbleHeight = messageText.height + padding * 2;
    
    // Create bubble background with graphics
    const bubbleGraphics = this.add.graphics();
    bubbleGraphics.fillStyle(0xffffff, 0.95);
    bubbleGraphics.lineStyle(2, 0x333333, 1);
    
    // Rounded rectangle for bubble
    bubbleGraphics.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 6);
    bubbleGraphics.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 6);
    
    // Pointer/tail pointing toward the car (bottom-left)
    bubbleGraphics.fillStyle(0xffffff, 0.95);
    bubbleGraphics.beginPath();
    bubbleGraphics.moveTo(-bubbleWidth / 2 + 10, bubbleHeight / 2); // Start at bottom edge
    bubbleGraphics.lineTo(-bubbleWidth / 2 - 8, bubbleHeight / 2 + 12); // Point toward car
    bubbleGraphics.lineTo(-bubbleWidth / 2 + 22, bubbleHeight / 2); // Back to bottom edge
    bubbleGraphics.closePath();
    bubbleGraphics.fillPath();
    
    // Outline for the pointer
    bubbleGraphics.lineStyle(2, 0x333333, 1);
    bubbleGraphics.beginPath();
    bubbleGraphics.moveTo(-bubbleWidth / 2 + 10, bubbleHeight / 2);
    bubbleGraphics.lineTo(-bubbleWidth / 2 - 8, bubbleHeight / 2 + 12);
    bubbleGraphics.lineTo(-bubbleWidth / 2 + 22, bubbleHeight / 2);
    bubbleGraphics.strokePath();
    
    // Add to container
    this.speechBubble.add([bubbleGraphics, messageText]);
    
    // Animate in
    this.speechBubble.setScale(0);
    this.speechBubble.setAlpha(0);
    this.tweens.add({
      targets: this.speechBubble,
      scale: 1,
      alpha: 1,
      duration: 150,
      ease: 'Back.easeOut'
    });
    
    // Auto-remove after duration
    this.time.delayedCall(duration, () => {
      if (this.speechBubble) {
        this.tweens.add({
          targets: this.speechBubble,
          scale: 0,
          alpha: 0,
          duration: 150,
          ease: 'Back.easeIn',
          onComplete: () => {
            if (this.speechBubble) {
              this.speechBubble.destroy();
              this.speechBubble = undefined;
            }
          }
        });
      }
    });
  }
  
  private updateUI() {
    // Update clock
    const hours = Math.floor(this.currentTime / 60);
    const minutes = Math.floor(this.currentTime % 60);
    const seconds = Math.floor((this.currentTime % 1) * 60);
    const clockText = this.children.getByName('clockText') as Phaser.GameObjects.Text;
    if (clockText) {
      clockText.setText(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} AM`);
    }
    
    // Update rage meter
    const rageMeter = this.children.getByName('rageMeter') as Phaser.GameObjects.Rectangle;
    if (rageMeter) {
      const rageBarWidth = this.registry.get('rageBarWidth') || 208;
      rageMeter.width = (this.rageLevel / 100) * rageBarWidth;
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
      
      const miles = Math.max(0, remaining / this.unitsPerMile).toFixed(1);
      distanceText.setText(`→ ${target}: ${miles} mi`);
    }
  }
  
}

