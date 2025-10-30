import Phaser from "phaser";
import { createGraysonSprite, updateGraysonWalk, createCeciSprite, createRandomGuySprite, createSecurityGuardSprite, createFurrySprite } from "../utils/sprites";
import { getHorizontalAxis, shouldCloseDialogue, HELP_HINT_X, HELP_HINT_Y } from "../utils/controls";
import type { GameControls } from "../utils/controls";
import { HelpMenu } from "../utils/helpMenu";
import { PauseMenu } from "../utils/pauseMenu";
import { DialogueManager } from "../utils/dialogueManager";
import { handleMenuInput } from "../utils/menuHandler";
import { initializeGameScene } from "../utils/sceneSetup";
import { fadeToScene, fadeIn } from "../utils/sceneTransitions";
import { PROMPT_TEXT_STYLE, HELP_HINT_TEXT_STYLE, STATION_SIGN_STYLE, SMALL_LABEL_STYLE, THOUGHT_BUBBLE_STYLE } from "../config/textStyles";

export default class NorthgateScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerSprite!: Phaser.GameObjects.Container;
  private controls!: GameControls;
  private helpMenu!: HelpMenu;
  private pauseMenu!: PauseMenu;
  private dialogueManager!: DialogueManager;
  
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private escalators: Phaser.GameObjects.Rectangle[] = [];
  private train!: Phaser.Physics.Arcade.Sprite;
  private ceci!: Phaser.GameObjects.Container;
  private randomGuy!: Phaser.GameObjects.Container;
  
  private speed = 100;
  
  private cardFragmentCollected = false;
  private ceciHasArrived = false;
  private firstTrainPassed = false;
  private hasTicket = false;
  private isDrugged = false;
  private graysonHasEntered = false;
  private ceciFollowing = false;
  private guardDialogueCooldown = 0;
  
  // NPCs
  private securityGuard!: Phaser.GameObjects.Container;
  private ticketMachine!: Phaser.GameObjects.Graphics;
  private ticketGate!: Phaser.GameObjects.Rectangle;
  private syringes: Phaser.Physics.Arcade.Sprite[] = [];
  private furries: Phaser.GameObjects.Container[] = [];
  private furryDialogueShown: boolean[] = [false, false];
  
  // Dialogue
  private dialogVisible = false;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super("Northgate");
  }

  create() {
    // Initialize common scene elements (camera, controls, menus, dialogue)
    const setup = initializeGameScene(this);
    this.controls = setup.controls;
    this.helpMenu = setup.helpMenu;
    this.pauseMenu = setup.pauseMenu;
    this.dialogueManager = setup.dialogueManager;
    
    // Background - metro station aesthetic
    this.createStationBackground();
    
    // Create platforms
    this.createPlatforms();
    
    // Create train
    this.createTrain();
    
    // Create player with physics
    this.createPlayer();
    
    // Create Ceci and RandomGuy (will arrive on train)
    this.createCeci();
    this.createRandomGuy();
    
    // Create security guard
    this.createSecurityGuard();
    
    // Create ticket machine
    this.createTicketMachine();
    
    // Create syringes (hazards)
    this.createSyringes();
    
    // Create furries (NPCs)
    this.createFurries();
    
    // UI
    this.createUI();
  }
  
  private createStationBackground() {
    // Dark metro background
    const bg = this.add.rectangle(160, 90, 320, 180, 0x1a1a2e, 1);
    bg.setOrigin(0.5);
    
    // Metro grid lines
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x00d4ff, 0.2);
    
    // Vertical lines
    for (let x = 0; x <= 320; x += 32) {
      graphics.lineBetween(x, 0, x, 180);
    }
    
    // Horizontal lines
    for (let y = 0; y <= 180; y += 32) {
      graphics.lineBetween(0, y, 320, y);
    }
    
    // Station sign
    this.add.text(160, 10, "NORTHGATE STATION", STATION_SIGN_STYLE).setOrigin(0.5);
    
    // Exit sign on top left
    this.add.text(15, 10, "← EXIT", SMALL_LABEL_STYLE).setOrigin(0, 0.5);
  }
  
  private createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    
    // Bottom platform (ground)
    const ground = this.add.rectangle(160, 170, 320, 10, 0x555555);
    this.platforms.add(ground, true);
    
    // Platform 1 (mid-low)  
    const platform1 = this.add.rectangle(120, 125, 110, 6, 0x666666);
    this.platforms.add(platform1, true);
  
    
    // Platform 2 (train level) - split with gap for escalator
    const platform3Left = this.add.rectangle(70, 85, 140, 6, 0x777777);
    this.platforms.add(platform3Left, true);
    
    const platform3Right = this.add.rectangle(250, 85, 160, 6, 0x777777);
    this.platforms.add(platform3Right, true);

    // Visual rails for train platform (with gap)
    this.add.rectangle(120, 85, 240, 2, 0xffeb3b, 0.8);
    this.add.rectangle(300, 85, 60, 2, 0xffeb3b, 0.8);

    // Platform 3 (mid-high)
    const platform2 = this.add.rectangle(120, 45, 240, 8, 0x666666);
    this.platforms.add(platform2, true);
    
    // Create all escalators
    this.createEscalators();
  }
  
  private createEscalators() {
    // Escalator 1: Ground (170) to Platform 1 (125)
    this.createEscalatorVisual(50, 170, 120);
    
    // Escalator 2: Platform 1 (125) to Platform 3/Train (85)
    this.createEscalatorVisual(155, 125, 80);
    
    // Escalator 3: Platform 3/Train (85) to Platform 2/Top (45)
    this.createEscalatorVisual(255, 85, 40);
  }
  
  private createEscalatorVisual(x: number, bottomY: number, topY: number) {
    const width = 30;
    const height = bottomY - topY; // Distance from bottom to top
    const centerY = (bottomY + topY) / 2;
    
    // Escalator zone (collision area)
    const escalatorZone = this.add.rectangle(x, centerY, width, height, 0x888888, 0.6);
    this.escalators.push(escalatorZone);
    
    // Visual steps
    const steps = this.add.graphics();
    steps.lineStyle(1, 0xaaaaaa, 0.8);
    const numSteps = Math.floor(height / 7);
    for (let i = 0; i < numSteps; i++) {
      const stepY = topY + i * 7;
      steps.lineBetween(x - width/2, stepY, x + width/2, stepY);
    }
    
    // Arrow indicating up
    this.add.text(x, centerY, "↑", {
      fontSize: "16px",
      color: "#00ff00",
    }).setOrigin(0.5);
  }
  
  private createTrain() {
    // Train on level 3 (platform 2) - Seattle Light Rail colors
    // Ceci is on level 4 (top platform) because she already got off
    this.train = this.physics.add.sprite(400, 65, '');
    const trainWidth = 100;
    const trainHeight = 35;
    this.train.setDisplaySize(trainWidth, trainHeight);
    // Medium hitbox - not too loose, not too tight
    this.train.setSize(90, 32);
    this.train.setOffset(5, 2); // Center the hitbox
    
    // Visual representation - Seattle Light Rail style (blue/white/green)
    const trainGraphics = this.add.graphics();
    
    // Main body - light blue/teal
    trainGraphics.fillStyle(0x0077be, 1);
    trainGraphics.fillRect(0, 0, trainWidth, trainHeight);
    
    // Top stripe - white
    trainGraphics.fillStyle(0xffffff, 1);
    trainGraphics.fillRect(0, 0, trainWidth, 8);
    
    // Bottom stripe - green (Sound Transit green)
    trainGraphics.fillStyle(0x00843d, 1);
    trainGraphics.fillRect(0, trainHeight - 6, trainWidth, 6);
    
    // Dark outline
    trainGraphics.lineStyle(2, 0x003d5c);
    trainGraphics.strokeRect(0, 0, trainWidth, trainHeight);
    
    // Windows (dark blue tint)
    trainGraphics.fillStyle(0x1a1a2e, 0.7);
    trainGraphics.fillRect(10, 10, 15, 15);
    trainGraphics.fillRect(35, 10, 15, 15);
    trainGraphics.fillRect(60, 10, 15, 15);
    trainGraphics.fillRect(85, 10, 10, 15);
    
    trainGraphics.generateTexture('soundtransit-train', trainWidth, trainHeight);
    trainGraphics.destroy();
    
    this.train.setTexture('soundtransit-train');
    this.train.setVelocityX(-150); // Move left
    (this.train.body as Phaser.Physics.Arcade.Body).setAllowGravity(false); // Train doesn't fall
    
    // Respawn train every 5 seconds
    this.time.addEvent({
      delay: 8000,
      callback: () => {
        this.train.x = 400;
        this.train.setVelocityX(-150);
      },
      loop: true
    });
  }
  
  private createPlayer() {
    // Create physics sprite for player (invisible) - start off-screen right
    this.player = this.physics.add.sprite(350, 155, '');
    this.player.setSize(12, 4); // Very small hitbox just at feet level
    this.player.setOffset(0, 22); // Only vertical offset to move collision to bottom (centered horizontally)
    this.player.setCollideWorldBounds(true);
    
    // Make physics body invisible
    this.player.setAlpha(0);
    
    // Create visual sprite
    this.playerSprite = createGraysonSprite(this, this.player.x, this.player.y);
    
    // Ensure container origin is centered for proper flipping
    // This prevents visual misalignment when sprite flips direction
    
    // Physics setup
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.train, this.hitByTrain, undefined, this);
  }
  
  private createCeci() {
    // Ceci starts hidden - will arrive on first train
    // Final position will be on left side of top platform
    this.ceci = createCeciSprite(this, -100, -100);
    this.ceci.setVisible(false);
  }
  
  private createRandomGuy() {
    // RandomGuy also arrives on train, then leaves
    this.randomGuy = createRandomGuySprite(this, -100, -100);
    this.randomGuy.setVisible(false);
  }
  
  private createSecurityGuard() {
    // Security guard on platform 1, blocking access to escalator 2
    this.securityGuard = createSecurityGuardSprite(this, 135, 115);
    
    // Invisible physical barrier that blocks escalator 2 access until ticket obtained
    // Position it directly in front of escalator 2 (at x: 155)
    this.ticketGate = this.add.rectangle(155, 115, 20, 25, 0x000000, 0);
    
    // Add to physics as static body
    this.physics.add.existing(this.ticketGate, true);
    
    // Collision with gate
    this.physics.add.collider(this.player, this.ticketGate);
  }
  
  private createSyringes() {
    // Create syringe hazards scattered on platforms
    // Small, realistic but not overly graphic
    
    const syringePositions = [
      { x: 80, y: 162 },   // Ground level (y: 170 - 8)
      { x: 240, y: 162 },  // Ground level
      { x: 200, y: 77 },   // Platform 3/Train level (y: 85 - 8)
      { x: 120, y: 37 },   // Top platform (y: 45 - 8) - moved to left
    ];
    
    syringePositions.forEach(pos => {
      const syringe = this.physics.add.sprite(pos.x, pos.y, '');
      
      // Visual - medium-sized syringe
      const syringeGraphics = this.add.graphics();
      
      // Sharp needle - light silver
      syringeGraphics.fillStyle(0xd0d0d0, 1);
      syringeGraphics.fillRect(0, 2, 5, 1);
      
      // Syringe barrel - very light/transparent
      syringeGraphics.fillStyle(0xf5f5f5, 0.95);
      syringeGraphics.fillRect(5, 1, 8, 3);
      
      // Plunger inside barrel - light gray
      syringeGraphics.fillStyle(0xbbbbbb, 0.8);
      syringeGraphics.fillRect(8, 2, 2, 1);
      
      // Plunger cap/end - orange
      syringeGraphics.fillStyle(0xff8844, 1);
      syringeGraphics.fillRect(13, 1, 2, 3);
      
      syringeGraphics.generateTexture('syringe-' + pos.x, 15, 5);
      syringeGraphics.destroy();
      
      syringe.setTexture('syringe-' + pos.x);
      syringe.setDisplaySize(15, 5);
      (syringe.body as Phaser.Physics.Arcade.Body).setSize(8, 3); // Smaller hitbox, easier to avoid
      const body = syringe.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setImmovable(true);
      
      this.syringes.push(syringe);
    });
    
    // Add collision detection for all syringes
    this.physics.add.collider(
      this.player, 
      this.syringes, 
      (_player, syringe) => {
        // Only trigger if Grayson has fully entered the scene
        if (this.graysonHasEntered) {
          this.hitHazard();
          (syringe as Phaser.Physics.Arcade.Sprite).destroy(); // Remove syringe after hit
        }
      }, 
      undefined, 
      this
    );
  }
  
  private createFurries() {
    // Create 2 convention-goers with furry tails that walk back and forth
    
    // Furry 1 - Bright pink shirt with brown tail (walks on platform 1)
    const furry1 = createFurrySprite(this, 100, 115, 0xff69b4, 0x8b4513);
    furry1.setData('walkMin', 70);
    furry1.setData('walkMax', 130);
    furry1.setData('walkDirection', 1);
    furry1.setData('walkSpeed', 20);
    furry1.setData('dialogue', "Don't worry, we're friendly!");
    this.furries.push(furry1);
    
    // Furry 2 - Bright cyan shirt with gray tail (walks on ground level)
    const furry2 = createFurrySprite(this, 150, 160, 0x00ffff, 0x999999);
    furry2.setData('walkMin', 100);
    furry2.setData('walkMax', 180);
    furry2.setData('walkDirection', -1);
    furry2.setData('walkSpeed', 25);
    furry2.setData('dialogue', "Heading downtown for the con!");
    this.furries.push(furry2);
  }
  
  private createTicketMachine() {
    // ORCA card reader on ground level, bottom right - like real Sound Transit reader
    const machineX = 292;
    const machineY = 140; // Higher up
    const floorY = 170; // Ground level
    
    this.ticketMachine = this.add.graphics();
    
    // Thin yellow support pole/stem from floor
    this.ticketMachine.fillStyle(0xffc107, 1);
    this.ticketMachine.fillRect(machineX + 5, machineY + 14, 2, floorY - (machineY + 14));
    
    // Yellow housing/body (reader head) - smaller
    this.ticketMachine.fillStyle(0xffc107, 1);
    this.ticketMachine.fillRoundedRect(machineX, machineY, 12, 14, 2);
    
    // Screen area - gray/dark
    this.ticketMachine.fillStyle(0x666666, 1);
    this.ticketMachine.fillRect(machineX + 2, machineY + 1, 8, 5);
    
    // Tap pad circle area - darker
    this.ticketMachine.fillStyle(0x444444, 1);
    this.ticketMachine.fillCircle(machineX + 6, machineY + 10, 3);
    
    // Small indicator light - red when not tapped
    this.ticketMachine.fillStyle(0xff0000, 1);
    this.ticketMachine.fillCircle(machineX + 6, machineY + 2, 1);
    
    // Orange border accent
    this.ticketMachine.lineStyle(1, 0xff9800, 1);
    this.ticketMachine.strokeRoundedRect(machineX, machineY, 12, 14, 2);
  }
  
  private createUI() {
    // Prompt text
    this.promptText = this.add.text(0, 0, "E to interact", PROMPT_TEXT_STYLE)
      .setOrigin(0.5).setVisible(false);
    
    // Help hint (bottom-right corner) - always visible in later levels
    this.add.text(HELP_HINT_X, HELP_HINT_Y, "H for Help", HELP_HINT_TEXT_STYLE)
      .setOrigin(1, 1)
      .setDepth(10);
    
    // Always visible in Northgate - player should know about help by now
    // (No need to check showHelpHint flag)
  }

  update() {
    if (!this.player || !this.playerSprite) return;
    
    const dt = this.game.loop.delta / 1000;
    
    // Handle menu input (ESC for pause, H for help)
    if (handleMenuInput(this, this.controls, this.helpMenu, this.pauseMenu)) {
      return; // Menus are active, don't process game input
    }
    
    // Handle dialogue
    if (this.dialogVisible) {
      if (shouldCloseDialogue(this.controls)) {
        this.hideDialog();
        // Set cooldown when dialogue is closed to prevent instant re-trigger
        this.guardDialogueCooldown = 1.5; // 1.5 second cooldown
      }
      return;
    }
    
    // Decrease guard dialogue cooldown
    if (this.guardDialogueCooldown > 0) {
      this.guardDialogueCooldown -= dt;
      if (this.guardDialogueCooldown < 0) this.guardDialogueCooldown = 0;
    }
    
    // Check for Ceci arrival on first train (must happen even before Grayson enters)
    if (!this.ceciHasArrived && !this.firstTrainPassed) {
      this.checkCeciArrival();
    }
    
    // Sync sprite position with physics body even when not moving
    // When facing right (scaleX -1), shift sprite left to align with physics box
    const xOffset = this.playerSprite.scaleX === -1 ? -12 : 0;
    this.playerSprite.x = Math.round(this.player.x + xOffset);
    this.playerSprite.y = Math.round(this.player.y + 4);
    
    // Can't control movement when drugged or before entering
    if (this.isDrugged || !this.graysonHasEntered) {
      return;
    }
    
    // Player movement - Horizontal movement (WASD + arrows)
    const hAxis = getHorizontalAxis(this, this.controls);
    if (hAxis < 0) {
      this.player.setVelocityX(-this.speed);
      this.playerSprite.setScale(1, 1); // Face left
    } else if (hAxis > 0) {
      this.player.setVelocityX(this.speed);
      this.playerSprite.setScale(-1, 1); // Face right
    } else {
      this.player.setVelocityX(0);
    }
    
    // Small jump (always available)
    const onGround = this.player.body!.touching.down;
    
    if (onGround && this.controls.jump.isDown) {
      // Small hop - enough to clear syringes but not reach platforms
      this.player.setVelocityY(-120);
    }
    
    // Escalator logic
    this.checkEscalator();
    
    // Update walking animation
    const isMoving = Math.abs(this.player.body!.velocity.x) > 0;
    updateGraysonWalk(this.playerSprite, isMoving);
    
    // Check security guard interaction
    this.checkSecurityGuard();
    
    // Check ticket machine
    this.checkTicketMachine();
    
    // Update furries walking
    this.updateFurries(dt);
    
    // Check proximity to furries
    this.checkFurryProximity();
    
    // Check proximity to Ceci (only after she's arrived)
    if (this.ceciHasArrived && !this.cardFragmentCollected) {
      this.checkCeciProximity();
    }
    
    // Ceci follows Grayson after meeting
    if (this.ceciFollowing) {
      this.updateCeciFollowing(dt);
    }
    
    // Check if reached exit
    if (this.cardFragmentCollected) {
      this.checkReachedExit();
    }
  }
  
  private updateCeciFollowing(dt: number) {
    // Ceci follows Grayson at a slight distance
    const followDistance = 25;
    const followSpeed = 60;
    
    const dx = this.player.x - this.ceci.x;
    const dy = this.player.y - this.ceci.y;
    const distance = Math.hypot(dx, dy);
    
    if (distance > followDistance) {
      const vx = (dx / distance) * followSpeed * dt;
      const vy = (dy / distance) * followSpeed * dt;
      
      this.ceci.x += vx;
      this.ceci.y += vy;
      
      // Face direction of movement
      this.ceci.setScale(dx > 0 ? -1 : 1, 1);
    }
  }
  
  private checkReachedExit() {
    // Check if Grayson reached the exit (top left)
    if (this.player.x < 20 && this.player.y < 50) {
      // Check if Ceci is also near the exit
      const ceciNearExit = this.ceci.x < 50 && this.ceci.y < 60;
      
      if (ceciNearExit && !this.isDrugged) {
        // Level complete! Transition back to void
        this.isDrugged = true; // Freeze player
        this.player.setVelocity(0, 0); // Stop movement
        
        // Increment completed levels and transition back to GameScene
        const currentLevels = this.registry.get('completedLevels') || 0;
        this.registry.set('completedLevels', Math.max(currentLevels, 1));
        fadeToScene(this, "Game", 1000);
      }
    }
  }
  
  private updateFurries(dt: number) {
    this.furries.forEach(furry => {
      const walkMin = furry.getData('walkMin');
      const walkMax = furry.getData('walkMax');
      const walkSpeed = furry.getData('walkSpeed');
      let walkDirection = furry.getData('walkDirection');
      
      // Move furry
      furry.x += walkDirection * walkSpeed * dt;
      
      // Flip sprite based on direction
      furry.setScale(walkDirection > 0 ? -1 : 1, 1);
      
      // Reverse direction at boundaries
      if (furry.x <= walkMin || furry.x >= walkMax) {
        walkDirection *= -1;
        furry.setData('walkDirection', walkDirection);
      }
    });
  }
  
  private graysonEnters() {
    // Grayson walks in from the right, stops to the left of the syringe at x: 240
    this.tweens.add({
      targets: this.player,
      x: 220, // Left of the right-side syringe
      duration: 1500,
      ease: "Power2",
      onUpdate: () => {
        // Face left while walking in
        this.playerSprite.setScale(1, 1);
      },
      onComplete: () => {
        // Now player can control Grayson
        this.graysonHasEntered = true;
      }
    });
  }
  
  private checkFurryProximity() {
    this.furries.forEach((furry, index) => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        furry.x,
        furry.y
      );
      
      // Show dialogue when player passes nearby (smaller range - must be close)
      if (distance < 18 && !this.furryDialogueShown[index] && !this.dialogVisible) {
        this.furryDialogueShown[index] = true;
        
        // Stop player movement when dialogue appears
        this.player.setVelocity(0, 0);
        
        const dialogue = furry.getData('dialogue');
        this.showDialog(dialogue);
      }
    });
  }
  
  private checkEscalator() {
    // Check if player overlaps with any escalator
    const playerBounds = this.player.getBounds();
    
    for (let i = 0; i < this.escalators.length; i++) {
      const escalator = this.escalators[i];
      const bounds = escalator.getBounds();
      
      if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, playerBounds)) {
        // Escalator 2 (index 1) requires ticket
        if (i === 1 && !this.hasTicket) {
          return; // Can't use this escalator without ticket
        }
        
        // Escalators work when pressing UP arrow/W (going up)
        if (this.controls.up.isDown || this.input.keyboard!.addKey('W').isDown) {
          // Only apply upward force if not already on a platform above the escalator
          if (this.player.y > bounds.top + 5) {
            this.player.setVelocityY(-150);
          }
        }
        
        // Go down with DOWN arrow/S (faster descent)
        if (this.controls.down.isDown || this.input.keyboard!.addKey('S').isDown) {
          this.player.setVelocityY(150);
        }
        
        break;
      }
    }
  }
  
  private checkCeciArrival() {
    // When train reaches middle of screen, Ceci gets off
    if (this.train.x < 200 && this.train.x > 100) {
      this.firstTrainPassed = true;
      
      // Make Ceci and RandomGuy visible on the train
      this.ceci.setVisible(true);
      this.ceci.x = this.train.x + 20; // On the train
      this.ceci.y = this.train.y;
      
      this.randomGuy.setVisible(true);
      this.randomGuy.x = this.train.x + 40; // Behind Ceci on train
      this.randomGuy.y = this.train.y;
      
      // Step 1: Both get off the train - move to train platform
      this.tweens.add({
        targets: this.ceci,
        x: 255, // Move to escalator
        y: 75, // Train platform level
        duration: 1500,
        ease: "Power2",
        onComplete: () => {
          // Step 2: Ceci takes escalator to top platform
          this.tweens.add({
            targets: this.ceci,
            y: 35, // Top platform
            duration: 2000,
            ease: "Linear",
            onComplete: () => {
              // Step 3: Ceci walks to final position on top platform (left side)
              this.tweens.add({
                targets: this.ceci,
                x: 80,
                duration: 2500,
                ease: "Linear",
                onComplete: () => {
                  this.ceciHasArrived = true;
                  // Show thought bubble (positioned to the left to avoid station sign)
                  const thoughtText = this.add.text(80, 30, "Meeting internet strangers\nat unknown train stations...\nPeak dating.", THOUGHT_BUBBLE_STYLE)
                    .setOrigin(0.5);
                  
                  // Fade out after a while, then Grayson enters
                  this.tweens.add({
                    targets: thoughtText,
                    alpha: 0,
                    delay: 3000,
                    duration: 2000,
                    onComplete: () => {
                      thoughtText.destroy();
                      // Now Grayson enters from the right!
                      this.graysonEnters();
                    }
                  });
                }
              });
            }
          });
        }
      });
      
      // RandomGuy also gets off and leaves quickly
      this.tweens.add({
        targets: this.randomGuy,
        x: 200, // Get off train
        y: 75,
        duration: 800,
        ease: "Power2",
        onComplete: () => {
          // Quickly moves to escalator 3
          this.tweens.add({
            targets: this.randomGuy,
            x: 255,
            y: 75,
            duration: 300,
            ease: "Linear",
            onComplete: () => {
              // Goes up escalator faster
              this.tweens.add({
                targets: this.randomGuy,
                y: 35,
                duration: 1000,
                ease: "Linear",
                onComplete: () => {
                  // Quickly walks left and exits (shows the exit clearly)
                  this.tweens.add({
                    targets: this.randomGuy,
                    x: -50,
                    duration: 1500,
                    ease: "Linear",
                    onComplete: () => {
                      this.randomGuy.setVisible(false);
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  }
  
  private checkSecurityGuard() {
    // Ticket gate blocks passage until ticket obtained
    // The invisible barrier physically prevents passage
    
    // Check if player is near security guard on platform 1
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.securityGuard.x,
      this.securityGuard.y
    );
    
    // If player tries to pass without ticket - show message (with cooldown to prevent spam)
    if (distance < 20 && !this.hasTicket && !this.dialogVisible && this.guardDialogueCooldown === 0) {
      // Stop player movement when guard speaks
      this.player.setVelocity(0, 0);
      
      this.showDialog("Security: Do you have your ticket?\nPlease tap your ORCA card at the reader.\nHead back down!");
    }
  }
  
  private checkTicketMachine() {
    // Check if player is near ticket machine (bottom right)
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      298, 147
    );
    
    if (distance < 20 && !this.hasTicket) {
      // Player can interact with machine after being asked for ticket
      // No prompt shown - player should know to press E from previous interactions
      
      if (Phaser.Input.Keyboard.JustDown(this.controls.interact)) {
        this.hasTicket = true;
        this.promptText.setVisible(false);
        this.showDialog("*taps ORCA card*\nTicket validated! You can now proceed.");
        
        // Remove the ticket gate barrier
        this.ticketGate.setVisible(false);
        this.ticketGate.destroy();
        
        // Visual feedback - indicator turns green
        const flashGraphics = this.add.graphics();
        flashGraphics.fillStyle(0x00ff00, 1);
        flashGraphics.fillCircle(298, 142, 1.5);
        
        this.tweens.add({
          targets: flashGraphics,
          alpha: 0,
          delay: 800,
          duration: 500,
          onComplete: () => flashGraphics.destroy()
        });
      }
    } else if (distance >= 20 && !this.hasTicket) {
      // Don't show prompt when not near machine (unless near Ceci)
      const nearCeci = this.ceciHasArrived && Phaser.Math.Distance.Between(
        this.player.x, this.player.y, this.ceci.x, this.ceci.y
      ) < 25;
      
      if (!nearCeci) {
        this.promptText.setVisible(false);
      }
    }
  }
  
  private checkCeciProximity() {
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.ceci.x,
      this.ceci.y
    );
    
    const near = distance < 20;
    
    // Auto-collect when reaching Ceci (no E prompt needed)
    if (near && !this.cardFragmentCollected && this.hasTicket) {
      console.log('Meeting Ceci! Distance:', distance); // Debug
      this.collectCardFragment();
    }
  }
  
  private hitByTrain() {
    // Player hit by train - dramatic knockout
    this.isDrugged = true; // Prevent movement during animation
    
    // Disable collisions so Grayson can fly off screen cleanly
    this.player.setCollideWorldBounds(false);
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    
    // Strong red flash (longer)
    this.cameras.main.flash(1500, 255, 0, 0);
    
    // Launch Grayson off screen with big force
    this.player.setVelocityX(-500);
    this.player.setVelocityY(-300);
    
    // Rapid tumbling while flying off screen
    this.tweens.add({
      targets: this.playerSprite,
      angle: -720, // Two full spins
      duration: 1500,
      ease: "Power2"
    });
    
    // After flying off, fade to black
    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(800, 0, 0, 0);
      
      // Respawn after fade
      this.time.delayedCall(800, () => {
        // Re-enable collisions
        this.player.setCollideWorldBounds(true);
        (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        
        // Reset position
        this.player.x = 200;
        this.player.y = 155;
        this.player.setVelocity(0, 0);
        this.playerSprite.setAngle(0);
        this.isDrugged = false;
        
        // Fade back in
        fadeIn(this, 600);
      });
    });
  }
  
  private hitHazard() {
    // Player got drugged - lay down effect
    this.isDrugged = true;
    this.player.setVelocity(0, 0);
    
    // Rotate sprite to laying down
    this.playerSprite.setAngle(90);
    
    // Yellow flash effect + screen wobble (longer)
    this.cameras.main.flash(200, 255, 255, 0);
    this.cameras.main.shake(5000, 0.003);
    
    // Screen fade/blur effect
    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        fadeIn(this, 500);
      });
    });
    
    // Dizzy stars above Grayson's head
    const stars = ["✦", "✧", "★"];
    for (let i = 0; i < 3; i++) {
      const star = this.add.text(
        this.player.x + (i - 1) * 12,
        this.player.y - 20,
        stars[i],
        {
          fontSize: "16px",
          color: "#ffeb3b",
          resolution: 1,
        }
      ).setOrigin(0.5);
      
      // Animate stars spinning and fading (longer duration)
      this.tweens.add({
        targets: star,
        angle: 360,
        y: this.player.y - 35,
        alpha: 0,
        duration: 4000,
        ease: "Power2",
        onComplete: () => star.destroy()
      });
    }
    
    // Warning message
    this.showDialog("Ouch! That wasn't candy!\nI just stepped on a needle...");
    
    // After 5 seconds, get back up (stay in same position)
    this.time.delayedCall(5000, () => {
      this.isDrugged = false;
      this.playerSprite.setAngle(0);
      this.hideDialog();
    });
  }
  
  private collectCardFragment() {
    this.cardFragmentCollected = true;
    this.ceciFollowing = true;
    this.promptText.setVisible(false);
    
    // Stop any existing movement
    this.player.setVelocity(0, 0);
    
    this.showDialog("Ceci: This is my first time at this station!\nHappy I found you, let's get out of here...");
    
    // Hide dialogue after a moment - longer so player can read
    this.time.delayedCall(4500, () => {
      this.hideDialog();
    });
  }
  
  private showDialog(message: string) {
    this.dialogVisible = true;
    this.dialogueManager.show(message);
  }
  
  private hideDialog() {
    this.dialogVisible = false;
    this.dialogueManager.hide();
  }
}

