import Phaser from "phaser";
import { createGraysonSprite, updateGraysonWalk, createCeciSprite, createSecurityGuardSprite, createFurrySprite } from "../utils/sprites";

export default class NorthgateScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerSprite!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private escalators: Phaser.GameObjects.Rectangle[] = [];
  private train!: Phaser.Physics.Arcade.Sprite;
  private ceci!: Phaser.GameObjects.Container;
  
  private speed = 100;
  
  private cardFragmentCollected = false;
  private ceciHasArrived = false;
  private firstTrainPassed = false;
  private hasTicket = false;
  private hasMetGuard = false;
  private isDrugged = false;
  
  // NPCs
  private securityGuard!: Phaser.GameObjects.Container;
  private ticketMachine!: Phaser.GameObjects.Graphics;
  private ticketGate!: Phaser.GameObjects.Rectangle;
  private syringes: Phaser.Physics.Arcade.Sprite[] = [];
  private furries: Phaser.GameObjects.Container[] = [];
  
  // Dialogue
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogVisible = false;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super("Northgate");
  }

  create() {
    this.cameras.main.setRoundPixels(true);
    
    // Background - metro station aesthetic
    this.createStationBackground();
    
    // Create platforms
    this.createPlatforms();
    
    // Create train
    this.createTrain();
    
    // Create player with physics
    this.createPlayer();
    
    // Create Ceci (on top platform)
    this.createCeci();
    
    // Create security guard
    this.createSecurityGuard();
    
    // Create ticket machine
    this.createTicketMachine();
    
    // Create syringes (hazards)
    this.createSyringes();
    
    // Create furries (NPCs)
    this.createFurries();
    
    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
      SPACE: this.input.keyboard!.addKey("SPACE"),
      E: this.input.keyboard!.addKey("E"),
      ENTER: this.input.keyboard!.addKey("ENTER"),
      ESC: this.input.keyboard!.addKey("ESC"),
    };
    
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
    this.add.text(160, 10, "NORTHGATE STATION", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#00d4ff",
      fontStyle: "bold",
      resolution: 1,
    }).setOrigin(0.5);
  }
  
  private createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    
    // Bottom platform (ground)
    const ground = this.add.rectangle(160, 170, 320, 10, 0x555555);
    this.platforms.add(ground);
    
    // Platform 1 (mid-low)
    const platform1 = this.add.rectangle(120, 125, 110, 8, 0x666666);
    this.platforms.add(platform1);
  
    
    // Platform 2 (train level) - split with gap for escalator
    const platform3Left = this.add.rectangle(70, 85, 140, 8, 0x777777);
    this.platforms.add(platform3Left);
    const platform3Right = this.add.rectangle(250, 85, 160, 8, 0x777777);
    this.platforms.add(platform3Right);
    
    // Platform 3 (mid-high)
    const platform2 = this.add.rectangle(140, 45, 200, 8, 0x666666);
    this.platforms.add(platform2);

    // Visual rails for train platform (with gap)
    this.add.rectangle(120, 85, 240, 2, 0xffeb3b, 0.8);
    this.add.rectangle(300, 85, 60, 2, 0xffeb3b, 0.8);
    
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
    this.train.setSize(trainWidth, trainHeight);
    this.train.setDisplaySize(trainWidth, trainHeight);
    
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
    // Create physics sprite for player (invisible) - start at bottom, slightly left of center
    this.player = this.physics.add.sprite(200, 155, '');
    this.player.setSize(14, 4); // Very small hitbox just at feet level
    this.player.setOffset(2, 22); // Large offset to move collision to bottom
    this.player.setCollideWorldBounds(true);
    
    // Make physics body invisible
    this.player.setAlpha(0);
    
    // Create visual sprite
    this.playerSprite = createGraysonSprite(this, this.player.x, this.player.y);
    
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
      (player, syringe) => {
        this.hitHazard();
        (syringe as Phaser.Physics.Arcade.Sprite).destroy(); // Remove syringe after hit
      }, 
      undefined, 
      this
    );
  }
  
  private createFurries() {
    // Create 2 convention-goers with furry tails
    
    // Furry 1 - Bright pink shirt with brown tail (on platform 1)
    const furry1 = createFurrySprite(this, 100, 115, 0xff69b4, 0x8b4513);
    this.furries.push(furry1);
    
    // Furry 2 - Bright cyan shirt with white tail (on ground level)
    const furry2 = createFurrySprite(this, 150, 160, 0x00ffff, 0xffffff);
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
    this.promptText = this.add.text(0, 0, "E to interact", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#cfe8ff",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: { left: 4, right: 4, top: 2, bottom: 2 },
      resolution: 2,
    }).setOrigin(0.5).setVisible(false);
    
    // Dialogue box
    this.dialogBox = this.add.rectangle(160, 160, 300, 40, 0x000000, 0.6)
      .setStrokeStyle(1, 0x99bbff, 0.9)
      .setOrigin(0.5)
      .setVisible(false);
    
    this.dialogText = this.add.text(20, 146, "", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#dff1ff",
      wordWrap: { width: 280 },
      resolution: 2,
    }).setOrigin(0, 0).setVisible(false);
  }

  update() {
    if (!this.player || !this.playerSprite) return;
    
    // Handle dialogue
    if (this.dialogVisible) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || 
          Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
        this.hideDialog();
      }
      return;
    }
    
    // Can't move when drugged
    if (this.isDrugged) {
      return;
    }
    
    // Player movement - Horizontal movement
    if (this.cursors.left?.isDown || this.keys.A.isDown) {
      this.player.setVelocityX(-this.speed);
      this.playerSprite.setScale(1, 1); // Face left
    } else if (this.cursors.right?.isDown || this.keys.D.isDown) {
      this.player.setVelocityX(this.speed);
      this.playerSprite.setScale(-1, 1); // Face right
    } else {
      this.player.setVelocityX(0);
    }
    
    // Small jump (always available)
    const onGround = this.player.body!.touching.down;
    
    if (onGround && this.keys.SPACE.isDown) {
      // Small hop
      this.player.setVelocityY(-140);
    }
    
    // Escalator logic
    this.checkEscalator();
    
    // Update walking animation
    const isMoving = Math.abs(this.player.body!.velocity.x) > 0;
    updateGraysonWalk(this.playerSprite, isMoving);
    
    // Sync sprite position with physics body
    // Add small offset to Y to align feet with platforms
    this.playerSprite.x = Math.round(this.player.x);
    this.playerSprite.y = Math.round(this.player.y + 4);
    
    // Check for Ceci arrival on first train
    if (!this.ceciHasArrived && !this.firstTrainPassed) {
      this.checkCeciArrival();
    }
    
    // Check security guard interaction
    this.checkSecurityGuard();
    
    // Check ticket machine
    this.checkTicketMachine();
    
    // Check proximity to Ceci (only after she's arrived)
    if (this.ceciHasArrived) {
      this.checkCeciProximity();
    }
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
        
        // Escalators work when pressing UP arrow (going up)
        if (this.cursors.up?.isDown || this.keys.W.isDown) {
          // Only apply upward force if not already on a platform above the escalator
          if (this.player.y > bounds.top + 5) {
            this.player.setVelocityY(-150);
          }
        }
        
        // Go down with DOWN arrow (faster descent)
        if (this.cursors.down?.isDown || this.keys.S.isDown) {
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
      
      // Make Ceci visible on the train
      this.ceci.setVisible(true);
      this.ceci.x = this.train.x + 20; // On the train
      this.ceci.y = this.train.y;
      
      // Step 1: Ceci gets off the train - moves to train platform
      this.tweens.add({
        targets: this.ceci,
        x: 255, // Move to escalator
        y: 75, // Train platform level
        duration: 1000,
        ease: "Power2",
        onComplete: () => {
          // Step 2: Ceci takes escalator to top platform
          this.tweens.add({
            targets: this.ceci,
            y: 35, // Top platform
            duration: 1500,
            ease: "Linear",
            onComplete: () => {
              // Step 3: Ceci walks to final position on top platform (left side)
              this.tweens.add({
                targets: this.ceci,
                x: 80,
                duration: 800,
                ease: "Power2",
                onComplete: () => {
                  this.ceciHasArrived = true;
                  // Show thought bubble (positioned to the left to avoid station sign)
                  const thoughtText = this.add.text(80, 30, "Meeting internet strangers\nat unknown train stations...\nPeak dating.", {
                    fontFamily: "monospace",
                    fontSize: "9px",
                    color: "#cfe8ff",
                    align: "center",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    padding: { left: 4, right: 4, top: 3, bottom: 3 },
                    resolution: 1,
                  }).setOrigin(0.5);
                  
                  // Fade out after a while
                  this.tweens.add({
                    targets: thoughtText,
                    alpha: 0,
                    delay: 3000,
                    duration: 2000,
                    onComplete: () => thoughtText.destroy()
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
    
    // If player tries to pass without ticket (smaller proximity - must be on same level)
    if (distance < 20 && !this.hasTicket && !this.hasMetGuard) {
      this.hasMetGuard = true;
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
      // Only show prompt if player has already been asked for ticket
      if (this.hasMetGuard) {
        this.promptText.setVisible(true);
        this.promptText.setPosition(298, 132);
      }
      
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
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
    
    const near = distance < 25;
    this.promptText.setVisible(near && !this.cardFragmentCollected && this.hasTicket);
    
    if (near) {
      this.promptText.setPosition(this.ceci.x, this.ceci.y - 20);
      
      if (Phaser.Input.Keyboard.JustDown(this.keys.E) && !this.cardFragmentCollected) {
        this.collectCardFragment();
      }
    }
  }
  
  private hitByTrain() {
    // Player death - respawn at start
    this.player.x = 200;
    this.player.y = 155;
    this.player.setVelocity(0, 0);
    
    // Flash effect
    this.cameras.main.flash(200, 255, 0, 0);
  }
  
  private hitHazard() {
    // Player got drugged - lay down effect
    this.isDrugged = true;
    this.player.setVelocity(0, 0);
    
    // Rotate sprite to laying down
    this.playerSprite.setAngle(90);
    
    // Yellow flash effect + screen wobble
    this.cameras.main.flash(200, 255, 255, 0);
    this.cameras.main.shake(3000, 0.003);
    
    // Warning message
    this.showDialog("Ouch! That wasn't candy...");
    
    // After 5 seconds, get back up (stay in same position)
    this.time.delayedCall(3000, () => {
      this.isDrugged = false;
      this.playerSprite.setAngle(0);
      this.hideDialog();
    });
  }
  
  private collectCardFragment() {
    this.cardFragmentCollected = true;
    this.promptText.setVisible(false);
    this.showDialog("Ceci: This is my first time at this station!\nSo glad we found each other!");
    
    // TODO: Add card fragment visual and transition to next level
  }
  
  private showDialog(message: string) {
    this.dialogVisible = true;
    this.dialogBox.setVisible(true);
    this.dialogText.setText(message).setVisible(true);
  }
  
  private hideDialog() {
    this.dialogVisible = false;
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
  }
}

