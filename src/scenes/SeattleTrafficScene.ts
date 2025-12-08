import Phaser from "phaser";
import { initializeGameScene } from "../utils/sceneSetup";
import { fadeToScene } from "../utils/sceneTransitions";
import { handleMenuInput } from "../utils/menuHandler";
import { GameStateManager } from "../managers/GameStateManager";
import { SCENES, VOID_LEVELS } from "../config/sceneConstants";
import { HELP_HINT_X, HELP_HINT_Y } from "../utils/controls";
import { HELP_HINT_TEXT_STYLE } from "../config/textStyles";
import { createVanSprite } from "../utils/sprites/VanSprite";
import { createTrafficCarSprite, getRandomCarColor } from "../utils/sprites/TrafficCarSprite";
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
  private trafficCars: { container: Phaser.GameObjects.Container, lane: number, speed: number, y: number, color: number, exiting?: boolean }[] = [];
  private carSpawnTimer = 0;
  private carSpawnInterval = 2000; // Spawn every 2 seconds
  
  // On-ramps and off-ramps (every 5 game minutes = 20 real seconds at 15x)
  private lastRampTime = 7 * 60 + 10; // Start time (5 min before game start so first ramps appear at 7:15)
  private rampInterval = 5; // Every 5 game minutes (20 real seconds at 15x)
  private activeRamps: { graphics: Phaser.GameObjects.Graphics, y: number, type: 'on' | 'off', label: Phaser.GameObjects.Text, checkpoint?: 'starbucks1' | 'starbucks2' | 'trailhead' }[] = []
  
  // Roadside elements (scrolling trees and rocks)
  private leftSideElements: { graphics: Phaser.GameObjects.Graphics, y: number, type: 'tree' | 'rock', xOffset: number }[] = [];
  private rightSideElements: { graphics: Phaser.GameObjects.Graphics, y: number, type: 'tree' | 'rock', xOffset: number }[] = [];
  private rightStripWidth = 55;
  
  // Dynamic sky
  private skyGraphics!: Phaser.GameObjects.Graphics;
  private starsGraphics!: Phaser.GameObjects.Graphics;
  
  // ===========================================
  // RAGE METER CONFIG - Adjust values here
  // ===========================================
  private readonly RAGE_CONFIG = {
    // Collision events
    hitCar: 20,                    // Hitting another car
    
    // Stuck in traffic (per second after 0.5s delay)
    stuckPerSecond: 5,             // Rage increase per second when stuck
    stuckDelay: 500,               // ms before stuck rage kicks in
    
    // Smooth driving recovery (per second)
    recoveryPerSecond: 0.5,        // Rage decrease per second when driving smoothly
    
    // Starbucks events
    wrongStarbucks: 50,            // Took exit but wrong Starbucks
    missedStarbucks1: 75,          // Missed first Starbucks exit
    missedStarbucks2: 80,          // Missed second Starbucks (the right one!)
    
    // Trailhead events
    missedTrailhead: 100,          // Missed final exit = instant max rage
  };
  // ===========================================
  
  // Game state
  private gamePhase: 'intro' | 'toStarbucks1' | 'atStarbucks1' | 'toStarbucks2' | 'atStarbucks2' | 'toTrailhead' | 'won' | 'lost' = 'intro';
  private distanceTraveled = 0;
  private currentTime = 7 * 60 + 15; // 7:15 AM in minutes
  private rageLevel = 0; // 0-100
  private stuckTimer = 0;
  private finalExitSpawned = false;
  private finalExitActive = false;
  private exitDecisionMade = false; // Ensure exit check only happens once
  
  // Starbucks exit flags
  private starbucks1ExitSpawned = false;
  private starbucks1ExitActive = false;
  private starbucks1ExitDecisionMade = false;
  private starbucks2ExitSpawned = false;
  private starbucks2ExitActive = false;
  private starbucks2ExitDecisionMade = false;
  
  // Checkpoints - tuned so ETA starts at 8:15 in middle lane (speed 100) at 45x time
  // At speed 100: 8000/100 * 0.75 = 60 game minutes → ETA 8:15
  private starbucks1Distance = 2667;   // 1/3 of total distance (~20 miles)
  private starbucks2Distance = 5333;   // 2/3 of total distance (~40 miles)
  private trailheadDistance = 8000;    // Full distance to trailhead (~60 miles)
  private unitsPerMile = 133.33;       // Conversion: 8000 units = 60 miles
  
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
    
    // Reset exit flags
    this.finalExitSpawned = false;
    this.finalExitActive = false;
    this.exitDecisionMade = false;
    this.starbucks1ExitSpawned = false;
    this.starbucks1ExitActive = false;
    this.starbucks1ExitDecisionMade = false;
    this.starbucks2ExitSpawned = false;
    this.starbucks2ExitActive = false;
    this.starbucks2ExitDecisionMade = false;
    
    // Reset ramps
    this.activeRamps = [];
    this.lastRampTime = 7 * 60 + 10;
    this.lastRampTime = 7 * 60 + 10; // Reset ramp timing (5 min before start)
    this.activeRamps = []; // Clear any leftover ramps
    this.finalExitSpawned = false;
    this.finalExitActive = false;
    this.exitDecisionMade = false;
    
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
      // Waiting for intro to finish, but still update UI
      this.updateUI();
      return;
    }
    
    if (this.gamePhase === 'won' || this.gamePhase === 'lost') {
      return;
    }
    
    // Active gameplay phases
    if (this.gamePhase.startsWith('to')) {
      this.updateDriving(dt);
      this.updateTraffic(dt);
      this.updateRoadsideElements(dt);
      this.updateClock(dt);
      this.updateRage(dt);
      this.updateSky();
      this.updateMirrors();
      this.checkRamps();
      this.checkCheckpoints();
      this.checkGameOver();
      this.updateUI();
    }
  }
  
  private createRoad() {
    // Dynamic sky gradient
    this.skyGraphics = this.add.graphics();
    this.skyGraphics.setDepth(0);
    
    // Stars (separate layer so they can fade)
    this.starsGraphics = this.add.graphics();
    this.starsGraphics.setDepth(0.1);
    
    // Store star positions for consistent rendering
    const starPositions: { x: number, y: number, size: number, alpha: number }[] = [];
    for (let i = 0; i < 30; i++) {
      starPositions.push({
        x: Math.random() * 320,
        y: Math.random() * (this.horizonY - 10),
        size: Math.random() < 0.3 ? 2 : 1,
        alpha: 0.4 + Math.random() * 0.6
      });
    }
    this.registry.set('starPositions', starPositions);
    
    // Initial sky draw
    this.updateSky();
    
    // Mountains and skyline on separate layer (so they don't get cleared with sky updates)
    const skylineGraphics = this.add.graphics();
    skylineGraphics.setDepth(0.2);
    
    // Mountains silhouette (Mt. Rainier style on right)
    this.drawMountains(skylineGraphics);
    
    // Seattle skyline
    this.drawSeattleSkyline(skylineGraphics);
    
    // Ground - grass on left side with gradient texture
    const grassGraphics = this.add.graphics();
    grassGraphics.setDepth(0);
    
    // Base grass color gradient (darker at horizon, slightly lighter near bottom)
    for (let y = this.horizonY; y < this.roadBottomY; y++) {
      const t = (y - this.horizonY) / (this.roadBottomY - this.horizonY);
      // Gradient from dark to slightly lighter green
      const r = Math.floor(20 + t * 8);
      const g = Math.floor(35 + t * 15);
      const b = Math.floor(20 + t * 8);
      grassGraphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      grassGraphics.fillRect(0, y, 80, 1);
    }
    
    // Add grass texture - small dots and dashes for varied look
    const grassColors = [0x1a3d1a, 0x163316, 0x1f4520, 0x142814, 0x0f1f10];
    for (let i = 0; i < 200; i++) {
      const gx = Math.random() * 80;
      const t = Math.random();
      const gy = this.horizonY + t * (this.roadBottomY - this.horizonY);
      const size = 1 + Math.random() * (1 + t); // Bigger dots near bottom
      
      grassGraphics.fillStyle(grassColors[Math.floor(Math.random() * grassColors.length)], 0.6 + Math.random() * 0.4);
      grassGraphics.fillRect(gx, gy, size, size * 1.5);
    }
    
    // Initialize scrolling roadside elements (left side)
    this.initLeftSideElements();
    
    // Middle section (between road edges) - draw first so water overlays it
    const middleGround = this.add.rectangle(160, (this.horizonY + this.roadBottomY) / 2, 160, this.roadBottomY - this.horizonY, 0x1a2a1a);
    middleGround.setDepth(0);
    
    // Brown dirt strip on right side of highway (between road and water)
    const stripWidth = 55; // Width of the dirt strip (wider)
    const stripGraphics = this.add.graphics();
    stripGraphics.setDepth(0.3);
    
    // Generate irregular edge offsets (cached for consistent water edge)
    const stripSegments = 20; // More segments for smoother irregular edge
    const edgeOffsets: number[] = [];
    for (let i = 0; i <= stripSegments; i++) {
      // Random offset for irregular shoreline (-5 to +8 pixels)
      edgeOffsets.push((Math.random() - 0.4) * 12);
    }
    
    // Draw brown strip following road's right edge with irregular outer edge
    stripGraphics.fillStyle(0x3d2a1a, 1); // Dark brown dirt
    stripGraphics.beginPath();
    const horizonRoadPos = this.getRoadPosition(1);
    stripGraphics.moveTo(horizonRoadPos.right, this.horizonY);
    stripGraphics.lineTo(horizonRoadPos.right + stripWidth * 0.3 + edgeOffsets[stripSegments], this.horizonY);
    // Follow curve down on outer edge with irregular offsets
    for (let i = stripSegments; i >= 0; i--) {
      const t = i / stripSegments;
      const pos = this.getRoadPosition(t);
      const sw = stripWidth * (0.3 + (1 - t) * 0.7) + edgeOffsets[i]; // Add irregular offset
      stripGraphics.lineTo(pos.right + sw, pos.y);
    }
    // Follow road edge back up
    for (let i = 0; i <= stripSegments; i++) {
      const t = i / stripSegments;
      const pos = this.getRoadPosition(t);
      stripGraphics.lineTo(pos.right, pos.y);
    }
    stripGraphics.closePath();
    stripGraphics.fillPath();
    
    // Add texture to dirt strip
    stripGraphics.fillStyle(0x4a3520, 0.5);
    for (let i = 0; i < 60; i++) {
      const t = Math.random();
      const pos = this.getRoadPosition(t);
      const sw = stripWidth * (0.3 + (1 - t) * 0.7);
      const dx = pos.right + 2 + Math.random() * (sw - 4);
      const dy = pos.y;
      stripGraphics.fillRect(dx, dy, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    
    // Initialize scrolling roadside elements (right side)
    this.initRightSideElements(stripWidth);
    
    // Water on right side (dark blue, Puget Sound) - starts after dirt strip
    const waterGraphics = this.add.graphics();
    waterGraphics.setDepth(0.5);
    waterGraphics.fillStyle(0x0a1a2a, 1); // Dark blue water
    
    // Draw water as polygon following dirt strip's irregular outer edge
    waterGraphics.beginPath();
    waterGraphics.moveTo(horizonRoadPos.right + stripWidth * 0.3 + edgeOffsets[stripSegments], this.horizonY);
    waterGraphics.lineTo(320, this.horizonY);
    waterGraphics.lineTo(320, this.roadBottomY);
    // Follow strip's irregular outer edge back up
    for (let i = 0; i <= stripSegments; i++) {
      const t = i / stripSegments;
      const pos = this.getRoadPosition(t);
      const sw = stripWidth * (0.3 + (1 - t) * 0.7) + edgeOffsets[i];
      waterGraphics.lineTo(pos.right + sw, pos.y);
    }
    waterGraphics.closePath();
    waterGraphics.fillPath();
    
    // Water reflections/shimmer
    waterGraphics.fillStyle(0x1a3a5a, 0.3);
    for (let i = 0; i < 8; i++) {
      const t = (i + 1) / 10;
      const pos = this.getRoadPosition(t);
      const sw = stripWidth * (0.3 + (1 - t) * 0.7);
      const wy = pos.y;
      const ww = 15 + Math.random() * 30;
      const wx = pos.right + sw + 5 + Math.random() * (320 - pos.right - sw - 15);
      if (wx + ww < 320) {
        waterGraphics.fillRect(wx, wy, ww, 2);
      }
    }
    
    // Underpass road - another highway crossing under the main one
    const underpassGraphics = this.add.graphics();
    underpassGraphics.setDepth(0.8); // Below main road
    
    // Shifted LEFT, bottom starts close to main highway's right edge
    const mainRoadBottomRight = this.roadCenterX + this.roadBottomWidth / 2; // ~300
    const underpassHorizonX = 95; // Far left at horizon (off-screen)
    const underpassBottomX = mainRoadBottomRight; // Just right of main road bottom
    const underpassTopWidth = 30;
    const underpassBottomWidth = 90;
    
    // Draw underpass road as filled polygon
    underpassGraphics.fillStyle(0x1a1a1a, 1); // Darker asphalt (in shadow)
    underpassGraphics.beginPath();
    
    // Left edge - from horizon going down
    underpassGraphics.moveTo(underpassHorizonX - underpassTopWidth / 2, this.horizonY);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const y = this.horizonY + t * (this.roadBottomY - this.horizonY);
      const centerX = underpassHorizonX + t * (underpassBottomX - underpassHorizonX);
      const width = underpassTopWidth + t * (underpassBottomWidth - underpassTopWidth);
      underpassGraphics.lineTo(centerX - width / 2, y);
    }
    
    // Right edge - back up
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      const y = this.horizonY + t * (this.roadBottomY - this.horizonY);
      const centerX = underpassHorizonX + t * (underpassBottomX - underpassHorizonX);
      const width = underpassTopWidth + t * (underpassBottomWidth - underpassTopWidth);
      underpassGraphics.lineTo(centerX + width / 2, y);
    }
    
    underpassGraphics.closePath();
    underpassGraphics.fillPath();
    
    // White edge lines
    underpassGraphics.lineStyle(2, 0xffffff, 0.6);
    // Left edge
    underpassGraphics.beginPath();
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const y = this.horizonY + t * (this.roadBottomY - this.horizonY);
      const centerX = underpassHorizonX + t * (underpassBottomX - underpassHorizonX);
      const width = underpassTopWidth + t * (underpassBottomWidth - underpassTopWidth);
      if (i === 0) underpassGraphics.moveTo(centerX - width / 2, y);
      else underpassGraphics.lineTo(centerX - width / 2, y);
    }
    underpassGraphics.strokePath();
    // Right edge
    underpassGraphics.beginPath();
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const y = this.horizonY + t * (this.roadBottomY - this.horizonY);
      const centerX = underpassHorizonX + t * (underpassBottomX - underpassHorizonX);
      const width = underpassTopWidth + t * (underpassBottomWidth - underpassTopWidth);
      if (i === 0) underpassGraphics.moveTo(centerX + width / 2, y);
      else underpassGraphics.lineTo(centerX + width / 2, y);
    }
    underpassGraphics.strokePath();
    
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
    // Handle negative t (below road bottom) by clamping curve calculation
    const clampedT = Math.max(0, t);
    const curveT = Math.pow(clampedT, 1.5); // Curve accelerates toward horizon
    
    const y = this.roadBottomY - t * (this.roadBottomY - this.horizonY);
    // For positions below road (t < 0), extrapolate centerX linearly from bottom
    const centerX = t < 0 
      ? this.roadCenterX  // Keep at road center for off-screen cars
      : this.roadCenterX + curveT * (this.horizonCenterX - this.roadCenterX);
    const width = this.roadBottomWidth - t * (this.roadBottomWidth - this.roadTopWidth);
    
    return {
      y,
      centerX,
      width,
      left: centerX - width / 2,
      right: centerX + width / 2
    };
  }
  
  private updateSky() {
    // Calculate time progress: 7:15 (435 min) = 0, 8:00 (480 min) = 1
    const startTime = 7 * 60 + 15; // 7:15 AM
    const endTime = 8 * 60; // 8:00 AM
    const timeProgress = Math.max(0, Math.min(1, (this.currentTime - startTime) / (endTime - startTime)));
    
    this.skyGraphics.clear();
    
    // Draw gradient sky - transitions from night to dawn to day
    for (let y = 0; y < this.horizonY; y++) {
      const t = y / this.horizonY; // 0 at top, 1 at horizon
      
      // Night colors (7:15)
      const nightTopR = 10, nightTopG = 15, nightTopB = 35;
      const nightHorizonR = 50, nightHorizonG = 35, nightHorizonB = 80;
      
      // Day colors (8:00) - soft early morning, gentle dawn
      const dayTopR = 55, dayTopG = 80, dayTopB = 120;
      const dayHorizonR = 140, dayHorizonG = 110, dayHorizonB = 100;
      
      // Interpolate between night and day based on time
      const topR = nightTopR + timeProgress * (dayTopR - nightTopR);
      const topG = nightTopG + timeProgress * (dayTopG - nightTopG);
      const topB = nightTopB + timeProgress * (dayTopB - nightTopB);
      const horizonR = nightHorizonR + timeProgress * (dayHorizonR - nightHorizonR);
      const horizonG = nightHorizonG + timeProgress * (dayHorizonG - nightHorizonG);
      const horizonB = nightHorizonB + timeProgress * (dayHorizonB - nightHorizonB);
      
      // Blend top to horizon
      const r = Math.floor(topR + t * (horizonR - topR));
      const g = Math.floor(topG + t * (horizonG - topG));
      const b = Math.floor(topB + t * (horizonB - topB));
      
      this.skyGraphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      this.skyGraphics.fillRect(0, y, 320, 1);
    }
    
    // Stars fade out as it gets lighter
    this.starsGraphics.clear();
    const starAlpha = Math.max(0, 1 - timeProgress * 1.5); // Stars gone by ~7:45
    if (starAlpha > 0) {
      const starPositions = this.registry.get('starPositions') as { x: number, y: number, size: number, alpha: number }[];
      if (starPositions) {
        for (const star of starPositions) {
          this.starsGraphics.fillStyle(0xffffff, star.alpha * starAlpha);
          this.starsGraphics.fillRect(star.x, star.y, star.size, star.size);
        }
      }
    }
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
  
  private initRightSideElements(stripWidth: number) {
    this.rightStripWidth = stripWidth;
    // Create initial set of trees and rocks on the right dirt strip
    for (let i = 0; i < 15; i++) {
      const y = this.horizonY + Math.random() * (this.roadBottomY - this.horizonY);
      const type = Math.random() < 0.7 ? 'tree' : 'rock';
      const xOffset = 0.15 + Math.random() * 0.5; // In dirt strip area
      this.spawnRightSideElement(y, type as 'tree' | 'rock', xOffset);
    }
  }
  
  private initLeftSideElements() {
    // Create initial set of trees and rocks on the left side (sparse)
    for (let i = 0; i < 15; i++) {
      const y = this.horizonY + Math.random() * (this.roadBottomY - this.horizonY);
      const type = Math.random() < 0.75 ? 'tree' : 'rock';
      const xOffset = Math.random() * 0.9; // Offset from left edge (as fraction of available space)
      this.spawnLeftSideElement(y, type as 'tree' | 'rock', xOffset);
    }
  }
  
  private spawnLeftSideElement(y: number, type: 'tree' | 'rock', xOffset: number) {
    const graphics = this.add.graphics();
    graphics.setDepth(1);
    this.leftSideElements.push({ graphics, y, type, xOffset });
    this.updateLeftSideElement({ graphics, y, type, xOffset });
  }
  
  private spawnRightSideElement(y: number, type: 'tree' | 'rock', xOffset: number) {
    const graphics = this.add.graphics();
    graphics.setDepth(0.9); // Above underpass (0.8) but below main road (1)
    this.rightSideElements.push({ graphics, y, type, xOffset });
    this.updateRightSideElement({ graphics, y, type, xOffset });
  }
  
  private updateLeftSideElement(elem: { graphics: Phaser.GameObjects.Graphics, y: number, type: 'tree' | 'rock', xOffset: number }) {
    const t = 1 - (elem.y - this.horizonY) / (this.roadBottomY - this.horizonY);
    const roadPos = this.getRoadPosition(t);
    const maxX = Math.max(5, roadPos.left - 8);
    const x = elem.xOffset * maxX;
    
    elem.graphics.clear();
    
    if (t < 0 || t > 1) return;
    
    if (elem.type === 'tree') {
      const scale = 0.3 + (1 - t) * 0.7;
      this.drawPineTree(elem.graphics, x, elem.y, scale);
    } else {
      const scale = 0.5 + (1 - t) * 0.5;
      this.drawRock(elem.graphics, x, elem.y, scale);
    }
  }
  
  private updateRightSideElement(elem: { graphics: Phaser.GameObjects.Graphics, y: number, type: 'tree' | 'rock', xOffset: number }) {
    const t = 1 - (elem.y - this.horizonY) / (this.roadBottomY - this.horizonY);
    const roadPos = this.getRoadPosition(t);
    const sw = this.rightStripWidth * (0.3 + (1 - t) * 0.7);
    const x = roadPos.right + elem.xOffset * sw;
    
    elem.graphics.clear();
    
    if (t < 0 || t > 1) return;
    
    // Check if element would be directly on the underpass road - don't draw if so
    // Underpass goes from horizon(95) to bottom(300), calculate its X at this Y
    const underpassHorizonX = 95;
    const underpassBottomX = 300;
    const underpassCenterX = underpassHorizonX + (1 - t) * (underpassBottomX - underpassHorizonX);
    const underpassWidth = 30 + (1 - t) * 60; // 30 at top, 90 at bottom
    // Only hide if directly on the road (no padding)
    if (x > underpassCenterX - underpassWidth / 2 + 7 && x < underpassCenterX + underpassWidth / 2 - 7) {
      // Element is on the underpass, don't draw
      return;
    }
    
    if (elem.type === 'tree') {
      const scale = 0.25 + (1 - t) * 0.5; // Bigger trees
      this.drawPineTree(elem.graphics, x, elem.y, scale);
    } else {
      const scale = 0.3 + (1 - t) * 0.4; // Bigger rocks
      this.drawRock(elem.graphics, x, elem.y, scale);
    }
  }
  
  private updateRoadsideElements(dt: number) {
    const scrollSpeed = this.roadSpeed * dt / 1000;
    
    // Update left side elements
    for (let i = this.leftSideElements.length - 1; i >= 0; i--) {
      const elem = this.leftSideElements[i];
      elem.y += scrollSpeed;
      
      // Remove if off screen, spawn new one at horizon
      if (elem.y > this.roadBottomY + 20) {
        elem.graphics.destroy();
        this.leftSideElements.splice(i, 1);
        // Spawn new element to maintain sparse forest
        const type = Math.random() < 0.75 ? 'tree' : 'rock';
        const xOffset = Math.random() * 0.9;
        this.spawnLeftSideElement(this.horizonY + 5, type as 'tree' | 'rock', xOffset);
      } else {
        this.updateLeftSideElement(elem);
      }
    }
    
    // Update right side elements
    for (let i = this.rightSideElements.length - 1; i >= 0; i--) {
      const elem = this.rightSideElements[i];
      elem.y += scrollSpeed;
      
      // Remove if off screen, spawn new one at horizon
      if (elem.y > this.roadBottomY + 20) {
        elem.graphics.destroy();
        this.rightSideElements.splice(i, 1);
        // Spawn new element at horizon
        const type = Math.random() < 0.7 ? 'tree' : 'rock';
        const xOffset = 0.15 + Math.random() * 0.5; // In dirt strip area
        this.spawnRightSideElement(this.horizonY + 5, type as 'tree' | 'rock', xOffset);
      } else {
        this.updateRightSideElement(elem);
      }
    }
  }
  
  private drawPineTree(graphics: Phaser.GameObjects.Graphics, x: number, baseY: number, scale: number) {
    const trunkWidth = 6 * scale;
    const trunkHeight = 15 * scale;
    const treeHeight = 55 * scale;
    const treeWidth = 26 * scale;
    
    // Trunk (brown)
    graphics.fillStyle(0x3d2817, 1);
    graphics.fillRect(x - trunkWidth / 2, baseY - trunkHeight, trunkWidth, trunkHeight);
    
    // Foliage - 3 triangular layers (bottom darker, top slightly bluer to stand out)
    const foliageColors = [0x142814, 0x1a3520, 0x1f4530]; // Bottom darkest, top darker teal-green
    
    for (let layer = 0; layer < 3; layer++) {
      const layerY = baseY - trunkHeight - (layer * treeHeight / 4);
      const layerWidth = treeWidth * (1 - layer * 0.25);
      const layerHeight = treeHeight / 2.5;
      
      graphics.fillStyle(foliageColors[layer], 1);
      graphics.fillTriangle(
        x - layerWidth / 2, layerY,           // Bottom left
        x + layerWidth / 2, layerY,           // Bottom right
        x, layerY - layerHeight               // Top
      );
    }
  }
  
  private drawRock(graphics: Phaser.GameObjects.Graphics, x: number, baseY: number, scale: number) {
    // Irregular rock shape - bigger and more visible
    const w = 14 * scale;
    const h = 9 * scale;
    
    // Dark base shadow
    graphics.fillStyle(0x252525, 1);
    graphics.fillEllipse(x + 1, baseY - h / 2 + 1, w, h);
    
    // Main rock body - lighter gray
    graphics.fillStyle(0x505050, 1);
    graphics.fillEllipse(x, baseY - h / 2, w, h);
    
    // Highlight on top
    graphics.fillStyle(0x686868, 1);
    graphics.fillEllipse(x - w * 0.1, baseY - h / 2 - h * 0.15, w * 0.6, h * 0.5);
    
    // Secondary bump
    graphics.fillStyle(0x454545, 1);
    graphics.fillEllipse(x + w * 0.35, baseY - h / 2 - h * 0.1, w * 0.5, h * 0.6);
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
    // Space Needle silhouette - lighter color to stand out against sky
    graphics.fillStyle(0x8090a0, 1);
    
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
    // Using the VanSprite for 3/4 rear-left diagonal view
    this.van = createVanSprite(this, this.getLaneX(1), this.vanY);
    this.van.setDepth(10);
  }
  
  private createUI() {
    // Clock (top-left)
    this.add.text(4, 4, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 3, y: 1 }
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
    this.add.rectangle(22, rageBarY, 26, 12, 0x000000, 0.5).setDepth(101);
    this.add.text(12, rageBarY, "RAGE", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ff0000"
    }).setDepth(102).setOrigin(0, 0.5);
    
    // Store bar width for update function
    this.registry.set('rageBarWidth', rageBarWidth);
    
    // Side mirrors (above rage bar)
    this.createSideMirrors();
    
    // ETA for hike (top right, opposite of clock)
    this.add.text(316, 4, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#ffff00",
      backgroundColor: "#000000",
      padding: { x: 3, y: 1 }
    }).setDepth(100).setOrigin(1, 0).setName('etaText');
    
    // Current checkpoint instruction (below water line)
    this.add.text(316, 45, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#000000",
      backgroundColor: "#ffffff",
      padding: { x: 3, y: 1 }
    }).setDepth(100).setOrigin(1, 0).setName('checkpointText');
    
    // Total hike distance (just below checkpoint)
    this.add.text(316, 57, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#000000",
      backgroundColor: "#ffffff",
      padding: { x: 3, y: 1 }
    }).setDepth(100).setOrigin(1, 0).setName('hikeDistText');
    
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
      
      this.updateCarPosition(car);
      
      // Remove if past screen (bottom) or near horizon (cars that pulled ahead)
      // Extended to allow left lane cars to spawn far behind
      if (car.y > this.roadBottomY + 150 || car.y < this.horizonY + 8) {
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
    let lane = Math.floor(Math.random() * 3);
    
    // During final exit, don't spawn cars in the right lane (keep it clear)
    if (this.finalExitActive && lane === 2) {
      lane = Math.floor(Math.random() * 2); // Only lanes 0 or 1
    }
    
    // Cars match their lane speed (with small variation)
    const baseLaneSpeed = this.laneSpeeds[lane];
    const speed = baseLaneSpeed + (Math.random() * 20 - 10); // ±10 variation
    
    // Create car container
    const container = this.add.container(0, 0);
    container.setDepth(5);
    
    // Create varied car shapes using sprite
    const color = getRandomCarColor();
    const carType = Math.floor(Math.random() * 4); // 0=sedan, 1=SUV, 2=compact, 3=truck
    
    // Create the car graphics and add to container
    const carSprite = createTrafficCarSprite(this, 0, 0, carType, color);
    const carGraphics = carSprite.getAt(0) as Phaser.GameObjects.Graphics;
    carSprite.remove(carGraphics);
    carSprite.destroy();
    container.add([carGraphics]);
    
    // Spawn position relative to player's lane:
    // STRICT RULE: Cars in player's current lane ALWAYS spawn ahead (never behind)
    let carY: number;
    if (lane === this.currentLane) {
      // SAME lane - always spawn ahead at horizon
      carY = this.horizonY + 10;
    } else if (lane < this.currentLane) {
      // Lane to the LEFT - faster cars, spawn far behind for 3+ sec visibility
      // At ~50px/sec relative speed, need 150px for 3 seconds
      carY = this.roadBottomY + 120;
    } else {
      // Lane to the RIGHT - slower cars, spawn ahead at horizon
      carY = this.horizonY + 10;
    }
    
    this.trafficCars.push({ container, lane, speed, y: carY, color });
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
  
  
  private checkCarCollision(car: { container: Phaser.GameObjects.Container, lane: number, y: number }): boolean {
    // Simple collision: same lane and overlapping Y
    if (car.lane !== this.currentLane) return false;
    
    // Don't collide with cars coming from behind in same lane
    // Only collide if car is ahead or overlapping from front
    if (car.y > this.vanY + 10) return false;
    
    const distance = Math.abs(car.y - this.vanY);
    return distance < 25;
  }
  
  private hitCar() {
    // Increase rage when hitting car
    this.rageLevel = Math.min(100, this.rageLevel + this.RAGE_CONFIG.hitCar);
    
    // Flash effect
    this.cameras.main.flash(200, 255, 0, 0, false);
    
    // Immediate rage check
    this.checkRageLimit();
  }
  
  private checkRageLimit() {
    if (this.rageLevel >= 100 && this.gamePhase !== 'lost') {
      this.loseByRage();
    }
  }
  
  private createSideMirrors() {
    const mirrorY = 130; // Above rage bar
    const mirrorWidth = 45;
    const mirrorHeight = 25;
    
    // Left mirror (shows lane to the left)
    const leftMirrorX = 2;
    const leftFrame = this.add.graphics();
    leftFrame.fillStyle(0x222222, 1);
    leftFrame.lineStyle(2, 0x444444, 1);
    // Trapezoid shape (wider at top for perspective)
    leftFrame.fillPoints([
      { x: leftMirrorX, y: mirrorY },
      { x: leftMirrorX + mirrorWidth + 4, y: mirrorY },
      { x: leftMirrorX + mirrorWidth, y: mirrorY + mirrorHeight },
      { x: leftMirrorX + 4, y: mirrorY + mirrorHeight }
    ], true);
    leftFrame.strokePoints([
      { x: leftMirrorX, y: mirrorY },
      { x: leftMirrorX + mirrorWidth + 4, y: mirrorY },
      { x: leftMirrorX + mirrorWidth, y: mirrorY + mirrorHeight },
      { x: leftMirrorX + 4, y: mirrorY + mirrorHeight }
    ], true);
    leftFrame.setDepth(100);
    
    // Left mirror content (will show cars)
    const leftContent = this.add.graphics();
    leftContent.setDepth(101);
    leftContent.setName('leftMirror');
    
    // Right mirror (shows lane to the right)
    const rightMirrorX = 270;
    const rightFrame = this.add.graphics();
    rightFrame.fillStyle(0x222222, 1);
    rightFrame.lineStyle(2, 0x444444, 1);
    // Trapezoid shape (mirrored)
    rightFrame.fillPoints([
      { x: rightMirrorX, y: mirrorY },
      { x: rightMirrorX + mirrorWidth + 4, y: mirrorY },
      { x: rightMirrorX + mirrorWidth, y: mirrorY + mirrorHeight },
      { x: rightMirrorX + 4, y: mirrorY + mirrorHeight }
    ], true);
    rightFrame.strokePoints([
      { x: rightMirrorX, y: mirrorY },
      { x: rightMirrorX + mirrorWidth + 4, y: mirrorY },
      { x: rightMirrorX + mirrorWidth, y: mirrorY + mirrorHeight },
      { x: rightMirrorX + 4, y: mirrorY + mirrorHeight }
    ], true);
    rightFrame.setDepth(100);
    
    // Right mirror content
    const rightContent = this.add.graphics();
    rightContent.setDepth(101);
    rightContent.setName('rightMirror');
    
    // Store mirror positions for update
    this.registry.set('leftMirrorPos', { x: leftMirrorX + 4, y: mirrorY + 2, w: mirrorWidth - 4, h: mirrorHeight - 4 });
    this.registry.set('rightMirrorPos', { x: rightMirrorX + 4, y: mirrorY + 2, w: mirrorWidth - 4, h: mirrorHeight - 4 });
  }
  
  private updateMirrors() {
    const leftMirror = this.children.getByName('leftMirror') as Phaser.GameObjects.Graphics;
    const rightMirror = this.children.getByName('rightMirror') as Phaser.GameObjects.Graphics;
    
    if (!leftMirror || !rightMirror) return;
    
    leftMirror.clear();
    rightMirror.clear();
    
    const leftPos = this.registry.get('leftMirrorPos');
    const rightPos = this.registry.get('rightMirrorPos');
    
    // Fill mirror backgrounds with dark tint
    leftMirror.fillStyle(0x1a1a2a, 0.8);
    leftMirror.fillRect(leftPos.x, leftPos.y, leftPos.w, leftPos.h);
    rightMirror.fillStyle(0x1a1a2a, 0.8);
    rightMirror.fillRect(rightPos.x, rightPos.y, rightPos.w, rightPos.h);
    
    // Check for cars in adjacent lanes
    const leftLane = this.currentLane - 1;
    const rightLane = this.currentLane + 1;
    
    // Detection ranges (matched to proximity calculation)
    // Left lane cars spawn at roadBottomY+120=300, van at 140, so 160px behind
    const leftRange = 170; // Show from spawn to passing (~3+ seconds)
    const rightRange = 80; // Right lane cars stay behind longer
    
    // Collect cars for each mirror, then sort by distance (farther first)
    type TrafficCar = { container: Phaser.GameObjects.Container, lane: number, speed: number, y: number, color: number, exiting?: boolean };
    const leftMirrorCars: { car: TrafficCar, distanceBehind: number }[] = [];
    const rightMirrorCars: { car: TrafficCar, distanceBehind: number }[] = [];
    
    for (const car of this.trafficCars) {
      // Only show cars BEHIND the player (y > vanY)
      if (car.y <= this.vanY) continue;
      
      const distanceBehind = car.y - this.vanY;
      
      if (car.lane === leftLane && leftLane >= 0 && distanceBehind < leftRange) {
        leftMirrorCars.push({ car, distanceBehind });
      }
      
      if (car.lane === rightLane && rightLane <= 2 && distanceBehind < rightRange) {
        rightMirrorCars.push({ car, distanceBehind });
      }
    }
    
    // Sort by distance descending (farther cars first, closer cars drawn on top)
    leftMirrorCars.sort((a, b) => b.distanceBehind - a.distanceBehind);
    rightMirrorCars.sort((a, b) => b.distanceBehind - a.distanceBehind);
    
    // Draw left mirror cars (keep within bounds)
    for (const { car, distanceBehind } of leftMirrorCars) {
      const proximity = 1 - (distanceBehind / leftRange);
      const carWidth = 6 + Math.pow(proximity, 1.5) * 20;  // Bigger
      const carHeight = carWidth * 0.7;
      // Calculate Y position, ensuring car stays within mirror bounds
      const maxY = leftPos.y + leftPos.h - carHeight - 4;
      const minY = leftPos.y + 2;
      const carY = minY + (maxY - minY) * (1 - proximity * 0.95);
      leftMirror.fillStyle(car.color, 0.9);
      leftMirror.fillRect(leftPos.x + leftPos.w/2 - carWidth/2, carY, carWidth, carHeight);
    }
    
    // Draw right mirror cars (keep within bounds)
    for (const { car, distanceBehind } of rightMirrorCars) {
      const proximity = 1 - (distanceBehind / rightRange);
      const carWidth = 6 + Math.pow(proximity, 1.5) * 20;  // Bigger
      const carHeight = carWidth * 0.7;
      // Calculate Y position, ensuring car stays within mirror bounds
      const maxY = rightPos.y + rightPos.h - carHeight - 4;
      const minY = rightPos.y + 2;
      const carY = minY + (maxY - minY) * (1 - proximity * 0.95);
      rightMirror.fillStyle(car.color, 0.9);
      rightMirror.fillRect(rightPos.x + rightPos.w/2 - carWidth/2, carY, carWidth, carHeight);
    }
    
    // Show "no lane" indicator if at edge
    if (this.currentLane === 0) {
      // No left lane - show forest hint
      leftMirror.fillStyle(0x2a4a2a, 0.5);
      leftMirror.fillRect(leftPos.x, leftPos.y, leftPos.w, leftPos.h);
    }
    if (this.currentLane === 2) {
      // No right lane - show water hint
      rightMirror.fillStyle(0x1a2a4a, 0.5);
      rightMirror.fillRect(rightPos.x, rightPos.y, rightPos.w, rightPos.h);
    }
  }
  
  private updateClock(dt: number) {
    // Time passes at 
    this.currentTime += dt / 1000 * 45 / 60; // Convert to minutes
  }
  
  private updateRage(dt: number) {
    // Rage increases when stuck behind slow cars
    const carAhead = this.trafficCars.find(car => 
      car.lane === this.currentLane && 
      car.y > this.vanY - 100 &&  // Large detection range - any car ahead in lane
      car.y < this.vanY
    );
    
    // Trigger if any car ahead, regardless of speed (you're in traffic!)
    if (carAhead) {
      this.stuckTimer += dt;
      if (this.stuckTimer > this.RAGE_CONFIG.stuckDelay) {
        this.rageLevel = Math.min(100, this.rageLevel + dt / 1000 * this.RAGE_CONFIG.stuckPerSecond);
        this.checkRageLimit(); // Immediate check
      }
    } else {
      this.stuckTimer = 0;
      // Slowly decrease rage when driving smoothly
      this.rageLevel = Math.max(0, this.rageLevel - dt / 1000 * this.RAGE_CONFIG.recoveryPerSecond);
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
    // Don't spawn regular ramps when close to any checkpoint exit
    const remainingToStarbucks1 = this.starbucks1Distance - this.distanceTraveled;
    const remainingToStarbucks2 = this.starbucks2Distance - this.distanceTraveled;
    const remainingToTrailhead = this.trailheadDistance - this.distanceTraveled;
    
    const nearCheckpoint = 
      (this.gamePhase === 'toStarbucks1' && remainingToStarbucks1 <= 600) ||
      (this.gamePhase === 'toStarbucks2' && remainingToStarbucks2 <= 600) ||
      (this.gamePhase === 'toTrailhead' && remainingToTrailhead <= 600);
    
    // Also don't spawn if a checkpoint exit is already active
    const checkpointExitActive = this.starbucks1ExitActive || this.starbucks2ExitActive || this.finalExitActive;
    
    if (this.currentTime >= this.lastRampTime + this.rampInterval && this.activeRamps.length === 0 && !nearCheckpoint && !checkpointExitActive) {
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
    // Create visual ramp only (no car exiting effect - looks bad going into water)
    this.createRampGraphics('off');
  }
  
  private spawnMergingCar() {
    // Merging cars come from the right edge, entering the right lane
    const container = this.add.container(0, 0);
    container.setDepth(5);
    
    // Get color first so body and car.color match
    const color = getRandomCarColor();
    const carType = Math.floor(Math.random() * 4);
    
    const carSprite = createTrafficCarSprite(this, 0, 0, carType, color);
    const carGraphics = carSprite.getAt(0) as Phaser.GameObjects.Graphics;
    carSprite.remove(carGraphics);
    carSprite.destroy();
    container.add([carGraphics]);
    
    // Spawn near the ramp position (find the on-ramp if exists)
    const onRamp = this.activeRamps.find(r => r.type === 'on');
    const rampY = onRamp ? onRamp.y : this.horizonY + 50;
    const carY = Math.max(this.horizonY + 15, Math.min(rampY + 10, this.roadBottomY - 30));
    const speed = this.laneSpeeds[2] + (Math.random() * 20 - 10); // Right lane speed
    
    const car = { container, lane: 2, speed, y: carY, color, exiting: false, merging: true };
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
    // Starbucks 1 exit logic
    if (this.gamePhase === 'toStarbucks1') {
      const remaining = this.starbucks1Distance - this.distanceTraveled;
      
      // Show warning at 500 units
      if (remaining <= 500 && remaining > 50 && !this.starbucks1ExitSpawned) {
        this.showSpeechBubble("Ceci", "Starbucks! Move right!", 3000);
        this.starbucks1ExitSpawned = true;
      }
      
      // Spawn exit ramp at 50 units
      if (remaining <= 50 && !this.starbucks1ExitActive) {
        console.log('Creating Starbucks 1 exit ramp, remaining:', remaining);
        this.starbucks1ExitActive = true;
        this.createStarbucksExitRamp(1);
        
        // Clear right lane
        for (let i = this.trafficCars.length - 1; i >= 0; i--) {
          if (this.trafficCars[i].lane === 2) {
            this.trafficCars[i].container.destroy();
            this.trafficCars.splice(i, 1);
          }
        }
      }
      
      // Check if exit is at van level
      const starbucks1Exit = this.activeRamps.find(r => r.checkpoint === 'starbucks1');
      
      // Debug: log ramp status
      if (this.starbucks1ExitActive) {
        console.log('SB1 Exit check:', {
          rampFound: !!starbucks1Exit,
          rampY: starbucks1Exit?.y,
          vanY: this.vanY,
          detectionRange: `${this.vanY - 20} to ${this.vanY + 20}`,
          decisionMade: this.starbucks1ExitDecisionMade,
          currentLane: this.currentLane,
          activeRamps: this.activeRamps.map(r => ({ type: r.type, checkpoint: r.checkpoint, y: r.y }))
        });
      }
      
      if (starbucks1Exit && this.starbucks1ExitActive && !this.starbucks1ExitDecisionMade) {
        const rampAtVan = starbucks1Exit.y >= this.vanY - 20 && starbucks1Exit.y <= this.vanY + 20;
        if (rampAtVan) {
          console.log('SB1 Exit DETECTED! Lane:', this.currentLane);
          this.starbucks1ExitDecisionMade = true;
          if (this.currentLane === 2) {
      this.arriveAtStarbucks1();
          } else {
            this.missedStarbucks1();
          }
        }
      }
    }
    
    // Starbucks 2 exit logic
    else if (this.gamePhase === 'toStarbucks2') {
      const remaining = this.starbucks2Distance - this.distanceTraveled;
      
      // Show warning at 500 units
      if (remaining <= 500 && remaining > 50 && !this.starbucks2ExitSpawned) {
        this.showSpeechBubble("Ceci", "That's my Starbucks! Exit!", 3000);
        this.starbucks2ExitSpawned = true;
      }
      
      // Spawn exit ramp at 50 units
      if (remaining <= 50 && !this.starbucks2ExitActive) {
        this.starbucks2ExitActive = true;
        this.createStarbucksExitRamp(2);
        
        // Clear right lane
        for (let i = this.trafficCars.length - 1; i >= 0; i--) {
          if (this.trafficCars[i].lane === 2) {
            this.trafficCars[i].container.destroy();
            this.trafficCars.splice(i, 1);
          }
        }
      }
      
      // Check if exit is at van level
      const starbucks2Exit = this.activeRamps.find(r => r.checkpoint === 'starbucks2');
      if (starbucks2Exit && this.starbucks2ExitActive && !this.starbucks2ExitDecisionMade) {
        const rampAtVan = starbucks2Exit.y >= this.vanY - 20 && starbucks2Exit.y <= this.vanY + 20;
        if (rampAtVan) {
          this.starbucks2ExitDecisionMade = true;
          if (this.currentLane === 2) {
      this.arriveAtStarbucks2();
          } else {
            this.missedStarbucks2();
          }
        }
      }
    }
    
    // Trailhead exit logic
    else if (this.gamePhase === 'toTrailhead') {
      const remaining = this.trailheadDistance - this.distanceTraveled;
      
      // Show early warning at 500 units (text only, no ramp yet)
      if (remaining <= 500 && remaining > 50 && !this.finalExitSpawned) {
        this.showSpeechBubble("Ceci", "Exit soon! Get right!", 3000);
        this.finalExitSpawned = true;
      }
      
      // Spawn the actual exit ramp at 50 units (very close to destination)
      if (remaining <= 50 && !this.finalExitActive) {
        this.finalExitActive = true;
        this.createExitRampVisual();
        
        // Clear right lane for the exit
        for (let i = this.trafficCars.length - 1; i >= 0; i--) {
          if (this.trafficCars[i].lane === 2) {
            this.trafficCars[i].container.destroy();
            this.trafficCars.splice(i, 1);
          }
        }
      }
      
      // Find the final exit ramp and check if it's at the van
      const finalExitRamp = this.activeRamps.find(r => r.checkpoint === 'trailhead');
      
      // Check if exit ramp is at the van's level (only check once!)
      if (finalExitRamp && this.finalExitActive && !this.exitDecisionMade) {
        // Ramp must be right at the van level
        const rampAtVan = finalExitRamp.y >= this.vanY - 20 && finalExitRamp.y <= this.vanY + 20;
        if (rampAtVan) {
          this.exitDecisionMade = true; // Prevent multiple checks
          // Must be in RIGHT lane (lane 2) to take exit
          if (this.currentLane === 2) {
            this.takeExit();
          } else {
            this.missedExit();
          }
        }
      }
    }
  }
  
  private takeExit() {
    this.gamePhase = 'won';
    this.finalExitActive = false;
    
    // Stop ALL scene movement
    this.roadSpeed = 0;
    
    // Stop traffic
    this.trafficCars.forEach(car => car.container.destroy());
    this.trafficCars = [];
    
    // Ramps will stop because roadSpeed is 0
    
    // Animate van sliding right onto the exit ramp
    this.tweens.add({
      targets: this.van,
      x: this.van.x + 100, // Slide right onto ramp
      alpha: 0, // Fade out as it exits
      duration: 1500,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Show victory sign
        this.showVictorySign();
      }
    });
  }
  
  private showVictorySign() {
    // Create victory sign overlay
    const overlay = this.add.rectangle(160, 100, 280, 120, 0x000000, 0.85).setDepth(400);
    
    const title = this.add.text(160, 70, "🏔️ TRAILHEAD REACHED! 🏔️", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#00ff00"
    }).setOrigin(0.5).setDepth(401);
    
    const subtitle = this.add.text(160, 95, "Time to hike!", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffffff"
    }).setOrigin(0.5).setDepth(401);
    
    // Show arrival time
    const hours = Math.floor(this.currentTime / 60);
    const mins = Math.floor(this.currentTime % 60);
    const timeText = this.add.text(160, 120, `Arrived at ${hours}:${mins.toString().padStart(2, '0')} AM`, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ffff00"
    }).setOrigin(0.5).setDepth(401);
    
    // Fade in the sign
    overlay.setAlpha(0);
    title.setAlpha(0);
    subtitle.setAlpha(0);
    timeText.setAlpha(0);
    
    this.tweens.add({
      targets: [overlay, title, subtitle, timeText],
      alpha: 1,
      duration: 500,
      onComplete: () => {
        // Wait then fade entire scene
        this.time.delayedCall(2500, () => {
          this.cameras.main.fadeOut(1000, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
      this.arriveAtTrailhead();
          });
        });
      }
    });
  }
  
  private createExitRampVisual() {
    this.showSpeechBubble("Ceci", "NOW! Exit right!", 2000);
    
    // Create the trailhead exit ramp
    const graphics = this.add.graphics();
    graphics.setDepth(1.5);
    
    const label = this.add.text(0, 0, 'EXIT >> TRAILHEAD', {
      fontFamily: 'monospace',
      fontSize: '5px',
      color: '#ffffff',
      backgroundColor: '#006633',
      padding: { x: 2, y: 1 }
    }).setDepth(100);
    
    const ramp = { graphics, y: this.horizonY + 20, type: 'off' as const, label, checkpoint: 'trailhead' as const };
    this.activeRamps.push(ramp);
    this.updateRampGraphics(ramp);
  }
  
  private createStarbucksExitRamp(starbucksNumber: number) {
    // Create Starbucks exit ramp
    const graphics = this.add.graphics();
    graphics.setDepth(1.5);
    
    const labelText = 'EXIT >> STARBUCKS';
    const label = this.add.text(0, 0, labelText, {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#ffffff',
      backgroundColor: '#00704A', // Starbucks green
      padding: { x: 3, y: 2 }
    }).setDepth(100);
    
    const checkpoint: 'starbucks1' | 'starbucks2' = starbucksNumber === 1 ? 'starbucks1' : 'starbucks2';
    const ramp = { graphics, y: this.horizonY + 20, type: 'off' as const, label, checkpoint };
    console.log('Starbucks ramp created:', { checkpoint, startY: ramp.y, horizonY: this.horizonY });
    this.activeRamps.push(ramp);
    this.updateRampGraphics(ramp);
  }
  
  private missedStarbucks1() {
    // Wrong Starbucks anyway - continue but increase rage
    this.gamePhase = 'toStarbucks2';
    this.starbucks1ExitActive = false;
    
    // Clean up the exit ramp
    this.cleanupActiveRamps();
    
    // Rage increase for missing
    this.rageLevel = Math.min(100, this.rageLevel + this.RAGE_CONFIG.missedStarbucks1);
    
    this.showSpeechBubble("Ceci", "Missed it... whatever, wrong one", 3000);
  }
  
  private missedStarbucks2() {
    // Missed the correct Starbucks - big rage increase but continue
    this.gamePhase = 'toTrailhead';
    this.starbucks2ExitActive = false;
    
    // Clean up the exit ramp
    this.cleanupActiveRamps();
    
    // Big rage increase for missing the right Starbucks
    this.rageLevel = Math.min(100, this.rageLevel + this.RAGE_CONFIG.missedStarbucks2);
    
    this.showSpeechBubble("Ceci", "WHAT?! My coffee!!", 3000);
    
    // Traffic gets heavier anyway
    this.carSpawnInterval = 1500;
  }
  
  private cleanupActiveRamps() {
    // Remove all active ramps (for checkpoint transitions)
    for (const ramp of this.activeRamps) {
      ramp.graphics.destroy();
      ramp.label.destroy();
    }
    this.activeRamps = [];
  }
  
  private missedExit() {
    this.gamePhase = 'lost';
    this.finalExitActive = false;
    
    // Max out rage
    this.rageLevel = this.RAGE_CONFIG.missedTrailhead;
    
    // Grayson's disappointed message (persistent - stays until restart)
    this.showSpeechBubble("Grayson", "Missed it. Trail's packed. Forget it.", 0, true);
    
    // Show retry prompt after a delay
    this.showRetryPrompt(3000);
  }
  
  private checkGameOver() {
    // Check rage limit
    this.checkRageLimit();
    
    // Lose if time reaches 8:00 AM
    if (this.currentTime >= 8 * 60) {
      this.loseByTime();
    }
  }
  
  private arriveAtStarbucks1() {
    // Pause gameplay during exit animation
    this.gamePhase = 'atStarbucks1';
    this.starbucks1ExitActive = false;
    const savedSpeed = this.roadSpeed;
    this.roadSpeed = 0;
    
    // Store original van position
    const originalX = this.van.x;
    
    // Animate van sliding right onto exit ramp
    this.tweens.add({
      targets: this.van,
      x: this.van.x + 80,
      alpha: 0.3,
      duration: 800,
      ease: 'Sine.easeIn',
      onComplete: () => {
        // Clean up the exit ramp while van is "off screen"
        this.cleanupActiveRamps();
        
        // Wait at Starbucks
        this.time.delayedCall(1500, () => {
          // Wrong Starbucks dialogue
          this.showSpeechBubble("Ceci", "Wrong one! Mine's next!", 3000);
        
        // Increase rage
          this.rageLevel = Math.min(100, this.rageLevel + this.RAGE_CONFIG.wrongStarbucks);
          
          // Animate van coming back from exit
          this.tweens.add({
            targets: this.van,
            x: originalX,
            alpha: 1,
            duration: 800,
            ease: 'Sine.easeOut',
            onComplete: () => {
              // Resume gameplay
          this.gamePhase = 'toStarbucks2';
              this.roadSpeed = savedSpeed;
            }
        });
      });
      }
    });
  }
  
  private arriveAtStarbucks2() {
    // Pause gameplay during exit animation
    this.gamePhase = 'atStarbucks2';
    this.starbucks2ExitActive = false;
    const savedSpeed = this.roadSpeed;
    this.roadSpeed = 0;
    
    // Store original van position
    const originalX = this.van.x;
    
    // Animate van sliding right onto exit ramp
    this.tweens.add({
      targets: this.van,
      x: this.van.x + 80,
      alpha: 0.3,
      duration: 800,
      ease: 'Sine.easeIn',
      onComplete: () => {
        // Clean up the exit ramp while van is "off screen"
        this.cleanupActiveRamps();
        
        // Wait at Starbucks (getting coffee)
        this.time.delayedCall(2000, () => {
          // Got coffee dialogue
          this.showSpeechBubble("Ceci", "Got my coffee! ☕", 2500);
          
          // Animate van coming back from exit
          this.tweens.add({
            targets: this.van,
            x: originalX,
            alpha: 1,
            duration: 800,
            ease: 'Sine.easeOut',
            onComplete: () => {
              // Resume gameplay with heavier traffic
          this.gamePhase = 'toTrailhead';
              this.roadSpeed = savedSpeed;
          this.carSpawnInterval = 1500;
            }
        });
      });
      }
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
    this.showSpeechBubble("Ceci", "Made it! Let's go! 🏔️", 2500);
    
    // Transition to next level after delay
    this.time.delayedCall(3000, () => {
      this.gameState.completeLevel(VOID_LEVELS.AFTER_SEATTLE_TRAFFIC);
      fadeToScene(this, SCENES.GAME, 1000);
    });
  }
  
  private loseByRage() {
    this.gamePhase = 'lost';
    
    // Slow down to a stop
    this.tweens.add({
      targets: this,
      roadSpeed: 0,
      duration: 1500,
      ease: 'Cubic.easeOut'
    });
    
    // Get rage meter and make it pulse/flash
    const rageMeter = this.children.getByName('rageMeter') as Phaser.GameObjects.Rectangle;
    if (rageMeter) {
      // Pulse the rage meter (scale and color flash)
      this.tweens.add({
        targets: rageMeter,
        scaleY: 1.5,
        duration: 200,
        yoyo: true,
        repeat: 5,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Screen shake
    this.cameras.main.shake(500, 0.01);
    
    // Flash red
    this.cameras.main.flash(300, 255, 0, 0, false);
    
    // Show "RAGE MAXED!" text that pulses
    const rageMaxText = this.add.text(160, 85, "🤬 RAGE MAXED! 🤬", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ff0000",
      backgroundColor: "#000000",
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(200);
    
    // Pulse the text
    this.tweens.add({
      targets: rageMaxText,
      scale: 1.15,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Show speech bubble after a moment
    this.time.delayedCall(800, () => {
      this.showSpeechBubble("Grayson", "Seattle wins, I quit.", 0, true);
    });
    
    this.showRetryPrompt(3500);
  }
  
  private loseByTime() {
    this.gamePhase = 'lost';
    
    this.showSpeechBubble("Grayson", "Too late... trail's packed", 0, true);
    
    this.showRetryPrompt(3000);
  }
  
  private showRetryPrompt(delay: number) {
    // Use setTimeout for real time (not affected by game timeScale)
    setTimeout(() => {
      // Show retry message
      const retryBg = this.add.rectangle(160, 100, 220, 70, 0x000000, 0.9).setDepth(300);
      const retryText = this.add.text(160, 85, "Another try?", {
      fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffffff"
      }).setOrigin(0.5).setDepth(301);
      const pressEnter = this.add.text(160, 115, "Press ENTER to restart", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#ffff00"
      }).setOrigin(0.5).setDepth(301);
      
      // Wait for Enter key
      const enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      enterKey?.once('down', () => {
        retryBg.destroy();
        retryText.destroy();
        pressEnter.destroy();
      this.scene.restart();
    });
    }, delay);
  }
  
  private showSpeechBubble(speaker: string, text: string, duration: number = 3000, persistent: boolean = false) {
    // Remove existing bubble if any
    if (this.speechBubble) {
      this.speechBubble.destroy();
    }
    
    // Position over the water (right side of screen), below the distance signs
    const bubbleX = 260;
    const bubbleY = 100;
    
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
    
    // Auto-remove after duration (unless persistent)
    if (!persistent) {
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
    
    // Update ETA, checkpoint, and hike distance
    const etaText = this.children.getByName('etaText') as Phaser.GameObjects.Text;
    const checkpointText = this.children.getByName('checkpointText') as Phaser.GameObjects.Text;
    const hikeDistText = this.children.getByName('hikeDistText') as Phaser.GameObjects.Text;
    
    if (etaText && checkpointText && hikeDistText) {
      // Calculate ETA using MIDDLE lane speed as baseline (100)
      // This way: fast lane (150) = ETA drops, middle (100) = stable, slow (50) = ETA rises
      // Because you TRAVEL at actual speed but ETA ASSUMES middle speed
      const remainingToHike = this.trailheadDistance - this.distanceTraveled;
      
      let etaHours: number;
      let etaMins: number;
      let etaMinutes: number;
      
      if (this.finalExitActive) {
        // At destination - ETA is current time
        etaMinutes = this.currentTime;
        etaHours = Math.floor(etaMinutes / 60);
        etaMins = Math.floor(etaMinutes % 60);
      } else {
        const baselineSpeed = this.laneSpeeds[1]; // Middle lane speed = 100
        const realSecondsToHike = remainingToHike / baselineSpeed;
        const gameMinutesToHike = realSecondsToHike * 45 / 60; // convert to game minutes at 45x speed
        etaMinutes = this.currentTime + gameMinutesToHike;
        etaHours = Math.floor(etaMinutes / 60);
        etaMins = Math.floor(etaMinutes % 60);
      }
      etaText.setText(`Arrive: ${etaHours}:${etaMins.toString().padStart(2, '0')} AM`);
      
      // Color code ETA: green < 8:00, yellow = 8:00, red > 8:00
      const deadline = 8 * 60; // 8:00 AM in minutes
      if (etaMinutes < deadline - 1) {
        etaText.setColor('#00ff00'); // Green - early
      } else if (etaMinutes <= deadline + 1) {
        etaText.setColor('#ffff00'); // Yellow - on time
      } else {
        etaText.setColor('#ff0000'); // Red - late
      }
      
      // Current checkpoint instruction
      if (this.gamePhase === 'intro' || this.gamePhase === 'toStarbucks1') {
        const remaining = this.starbucks1Distance - this.distanceTraveled;
        const miles = Math.max(0, remaining / this.unitsPerMile).toFixed(1);
        checkpointText.setText(`↱ ${miles} mi · Starbucks`);
        checkpointText.setColor('#000000');
        hikeDistText.setY(56); // Normal position below checkpoint
      } else if (this.gamePhase === 'toStarbucks2') {
        const remaining = this.starbucks2Distance - this.distanceTraveled;
        const miles = Math.max(0, remaining / this.unitsPerMile).toFixed(1);
        checkpointText.setText(`↱ ${miles} mi · Starbucks`);
        checkpointText.setColor('#000000');
        hikeDistText.setY(56); // Normal position below checkpoint
      } else if (this.gamePhase === 'toTrailhead') {
        if (this.finalExitActive) {
          // Exit ramp is on screen - urgent!
          checkpointText.setText('↱ EXIT NOW - RIGHT LANE!');
          checkpointText.setColor('#cc0000'); // Dark red warning
          hikeDistText.setY(56); // Normal position
        } else if (this.finalExitSpawned) {
          checkpointText.setText('↱ Exit ahead!');
          checkpointText.setColor('#996600'); // Dark yellow/orange warning
          hikeDistText.setY(56); // Normal position
        } else {
          checkpointText.setText(''); // No Starbucks stops
          hikeDistText.setY(45); // Move up to where checkpoint was
        }
      }
      
      // Total hike distance remaining (show 0 when exit is active)
      let hikeMiles: string;
      if (this.finalExitActive) {
        hikeMiles = "0.0"; // We're there!
      } else {
        hikeMiles = Math.max(0, remainingToHike / this.unitsPerMile).toFixed(1);
      }
      // Show turn arrow when hike is the next destination (no Starbucks showing)
      const showTurnArrow = this.gamePhase === 'toTrailhead' && !this.finalExitSpawned;
      hikeDistText.setText(`${showTurnArrow ? '↱ ' : ''}${hikeMiles} mi · Trailhead`);
    }
  }
  
}

