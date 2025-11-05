import Phaser from "phaser";
import * as THREE from "three";
import { initializeGameScene } from "../utils/sceneSetup";
import { fadeToScene } from "../utils/sceneTransitions";
import type { GameControls } from "../utils/controls";
import type { HelpMenu } from "../utils/helpMenu";
import type { PauseMenu } from "../utils/pauseMenu";

/**
 * Final Scene - 3D Camping Site with Space Needle View
 * All 4 memories collected - peaceful camping scene overlooking Seattle
 */
export default class CampingScene extends Phaser.Scene {
  private controls!: GameControls;
  private helpMenu!: HelpMenu;
  private pauseMenu!: PauseMenu;
  
  // Three.js 3D elements
  private threeScene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private threeRenderer!: THREE.WebGLRenderer; // Renamed to avoid conflict with Phaser
  private spaceNeedle!: THREE.Group;
  
  // Player character
  private player!: THREE.Mesh;
  private isJumping = false;
  private jumpVelocity = 0;
  
  // Camera controls
  private cameraAngleH = Math.PI / 3; // Start facing right (toward city)
  private cameraAngleV = 0.2; // Slightly upward
  private cameraDistance = 8;
  
  // Mouse controls
  private lastPointerX = 0;
  private lastPointerY = 0;
  private isPointerDown = false;

  constructor() {
    super("Camping");
  }

  create() {
    // Initialize common scene elements
    const setup = initializeGameScene(this);
    this.controls = setup.controls;
    this.helpMenu = setup.helpMenu;
    this.pauseMenu = setup.pauseMenu;
    
    // Set up Three.js 3D scene
    this.setupThreeJS();
    
    // Create camping scene
    this.createCampingSite();
    
    // Create Space Needle in distance
    this.createSpaceNeedle();
    
    // Create player character
    this.createPlayer();
    
    // Set up mouse controls
    this.setupMouseControls();
    
    // Overlay text
    this.add.text(160, 15, "All Memories Recovered", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(100);
    
    this.add.text(160, 35, "WASD/Arrows to move | Drag mouse to look | SPACE to jump", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#dddddd",
      stroke: "#000000",
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(100);
    
    this.add.text(160, 165, "Press ENTER to continue", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#aaaaaa"
    }).setOrigin(0.5).setDepth(100);
  }

  private setupThreeJS() {
    // Create Three.js scene with sunset gradient
    this.threeScene = new THREE.Scene();
    
    // Sunset gradient background
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#FF6B9D'); // Pink top
    gradient.addColorStop(0.4, '#FFA500'); // Orange middle
    gradient.addColorStop(0.7, '#FFD700'); // Golden
    gradient.addColorStop(1, '#87CEEB'); // Blue bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    this.threeScene.background = texture;
    
    // Create camera - will be controlled by player
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV
      320 / 180, // Aspect ratio
      0.1, // Near
      1000 // Far
    );
    // Initial position will be set in updateCameraPosition()
    this.updateCameraPosition();
    
    // Create renderer
    this.threeRenderer = new THREE.WebGLRenderer({ 
      antialias: false,
      alpha: true 
    });
    this.threeRenderer.setSize(320, 180);
    
    // Position renderer to overlay Phaser canvas exactly
    const gameCanvas = this.game.canvas;
    const rect = gameCanvas.getBoundingClientRect();
    
    this.threeRenderer.domElement.style.position = 'absolute';
    this.threeRenderer.domElement.style.top = rect.top + 'px';
    this.threeRenderer.domElement.style.left = rect.left + 'px';
    this.threeRenderer.domElement.style.width = rect.width + 'px';
    this.threeRenderer.domElement.style.height = rect.height + 'px';
    this.threeRenderer.domElement.style.pointerEvents = 'none';
    this.threeRenderer.domElement.style.zIndex = '1';
    
    // Add renderer to body
    document.body.appendChild(this.threeRenderer.domElement);
    
    // Sunset lighting
    const ambient = new THREE.AmbientLight(0xffa500, 0.8); // Warm orange ambient
    this.threeScene.add(ambient);
    
    const sunlight = new THREE.DirectionalLight(0xff6b35, 1.2); // Warm sunset light
    sunlight.position.set(-10, 5, -5);
    this.threeScene.add(sunlight);
  }
  
  private createPlayer() {
    // Simple capsule character (Grayson)
    const geometry = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x81c784, // Green (Grayson's shirt)
      roughness: 0.7
    });
    this.player = new THREE.Mesh(geometry, material);
    this.player.position.set(-2, 1, 2); // Start near tent
    this.threeScene.add(this.player);
    
    // Add simple head
    const headGeometry = new THREE.SphereGeometry(0.35, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac }); // Skin tone
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1;
    this.player.add(head);
  }
  
  private setupMouseControls() {
    // Track mouse movement for camera rotation
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isPointerDown = true;
      this.lastPointerX = pointer.x;
      this.lastPointerY = pointer.y;
    });
    
    this.input.on('pointerup', () => {
      this.isPointerDown = false;
    });
    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPointerDown) {
        // Calculate delta
        const deltaX = pointer.x - this.lastPointerX;
        const deltaY = pointer.y - this.lastPointerY;
        
        // Rotate camera
        this.cameraAngleH -= deltaX * 0.01; // Horizontal rotation
        this.cameraAngleV += deltaY * 0.01; // Vertical rotation
        
        // Clamp vertical rotation
        this.cameraAngleV = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraAngleV));
        
        // Update last position
        this.lastPointerX = pointer.x;
        this.lastPointerY = pointer.y;
      }
    });
  }
  
  private createCampingSite() {
    // Ground (brown dirt/forest floor)
    const groundGeometry = new THREE.PlaneGeometry(80, 80);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x6B5D4F, // Brown dirt
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    this.threeScene.add(ground);
    
    // Add scattered rocks on ground
    for (let i = 0; i < 15; i++) {
      const rockGeometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 6, 6);
      const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(
        (Math.random() - 0.5) * 20,
        0.1,
        (Math.random() - 0.5) * 15
      );
      rock.scale.set(1, 0.7, 1); // Flatten slightly
      this.threeScene.add(rock);
    }
    
    // Tent (orange/tan - left side) - A-frame style
    const tentGroup = new THREE.Group();
    
    // Tent body (pyramid/A-frame)
    const tentShape = new THREE.Shape();
    tentShape.moveTo(-1.5, 0);
    tentShape.lineTo(0, 1.8);
    tentShape.lineTo(1.5, 0);
    tentShape.lineTo(-1.5, 0);
    
    const extrudeSettings = { depth: 2, bevelEnabled: false };
    const tentGeometry = new THREE.ExtrudeGeometry(tentShape, extrudeSettings);
    const tentMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xD2691E, // Tan/brown
      side: THREE.DoubleSide 
    });
    const tent = new THREE.Mesh(tentGeometry, tentMaterial);
    tent.rotation.y = Math.PI / 2;
    tentGroup.add(tent);
    
    // Tent door flap (darker)
    const doorGeometry = new THREE.PlaneGeometry(0.8, 1.2);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 0.6, 1.01);
    tentGroup.add(door);
    
    tentGroup.position.set(-8, 0, 0);
    this.threeScene.add(tentGroup);
    
    // Campfire in center
    const fireGroup = new THREE.Group();
    
    // Rock ring around fire
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rockGeometry = new THREE.SphereGeometry(0.3, 6, 6);
      const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x505050 });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(
        Math.cos(angle) * 1.2,
        0.15,
        Math.sin(angle) * 1.2
      );
      rock.scale.set(1, 0.6, 1);
      fireGroup.add(rock);
    }
    
    // Fire logs (crossed)
    const logGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.5);
    const logMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(logGeometry, logMaterial);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i / 4) * Math.PI;
      log.position.y = 0.15;
      fireGroup.add(log);
    }
    
    // Fire (animated glow)
    const fireGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const fireMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff4500,
      transparent: true,
      opacity: 0.8
    });
    const fire = new THREE.Mesh(fireGeometry, fireMaterial);
    fire.position.y = 0.5;
    fire.scale.set(1, 1.5, 1);
    fireGroup.add(fire);
    
    // Inner fire glow
    const glowGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      transparent: true,
      opacity: 0.9
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 0.4;
    fireGroup.add(glow);
    
    fireGroup.position.set(0, 0, 2);
    this.threeScene.add(fireGroup);
    
    // Add trees around the camping area
    this.createForestTrees();
    
    // Camp chair near fire
    this.createCampChair(-2, 0, 3);
  }
  
  private createForestTrees() {
    // Create MANY pine trees - LEFT side and behind camp ONLY
    // City/Space Needle is on the RIGHT (+x direction, -z)
    // Keep that view completely clear!
    
    const treeCount = 50;
    
    for (let i = 0; i < treeCount; i++) {
      // Random position - focus on LEFT and BEHIND
      let x = -5 - Math.random() * 20; // LEFT side only (negative x)
      let z = -10 + Math.random() * 25; // Behind and beside
      
      // Also add some trees behind the camp
      if (Math.random() < 0.3) {
        x = (Math.random() - 0.5) * 30; // Can be anywhere horizontally
        z = 5 + Math.random() * 20; // But must be BEHIND (positive z)
      }
      
      // Skip if too close to campfire
      const distToFire = Math.sqrt(x * x + (z - 2) * (z - 2));
      if (distToFire < 6) continue;
      
      // Skip if too close to tent (tent is at -8, 0)
      const distToTent = Math.sqrt((x + 8) * (x + 8) + z * z);
      if (distToTent < 4) continue;
      
      const height = 8 + Math.random() * 8;
      
      // Trunk (very dark brown, almost black)
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, height);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a0f });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(x, height / 2, z);
      this.threeScene.add(trunk);
      
      // Pine foliage (dark green cone)
      const foliageGeometry = new THREE.ConeGeometry(1.5 + Math.random() * 0.5, 5, 8);
      const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x1a4d2e });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.set(x, height - 1, z);
      this.threeScene.add(foliage);
    }
    
    // Add mountain backdrop on LEFT and behind
    this.createMountainBackdrop();
  }
  
  private createMountainBackdrop() {
    // Create layered mountains on LEFT side and behind camp
    // NO mountains on right side (city view must be clear!)
    
    // Darker green for distant mountains
    const nearMountainMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a4d2e, // Dark green
      roughness: 0.9
    });
    
    const farMountainMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0f3a1f, // Even darker green for depth
      roughness: 0.9
    });
    
    // Layer 1 - Nearest mountains (LEFT and BEHIND)
    const mountain1 = new THREE.Mesh(
      new THREE.ConeGeometry(30, 28, 32),
      nearMountainMaterial
    );
    mountain1.position.set(-25, 0, -30);
    this.threeScene.add(mountain1);
    
    const mountain2 = new THREE.Mesh(
      new THREE.ConeGeometry(25, 22, 32),
      nearMountainMaterial
    );
    mountain2.position.set(-15, 0, 30);
    this.threeScene.add(mountain2);
    
    const mountain3 = new THREE.Mesh(
      new THREE.ConeGeometry(35, 30, 32),
      nearMountainMaterial
    );
    mountain3.position.set(0, 0, 40);
    this.threeScene.add(mountain3);
    
    // Layer 2 - Middle distance (larger, further back)
    const mountain4 = new THREE.Mesh(
      new THREE.ConeGeometry(40, 35, 32),
      farMountainMaterial
    );
    mountain4.position.set(-35, 0, -60);
    this.threeScene.add(mountain4);
    
    const mountain5 = new THREE.Mesh(
      new THREE.ConeGeometry(38, 32, 32),
      farMountainMaterial
    );
    mountain5.position.set(-25, 0, 55);
    this.threeScene.add(mountain5);
    
    const mountain6 = new THREE.Mesh(
      new THREE.ConeGeometry(32, 28, 32),
      farMountainMaterial
    );
    mountain6.position.set(-5, 0, 60);
    this.threeScene.add(mountain6);
    
    // Layer 3 - Furthest (huge, very far)
    const mountain7 = new THREE.Mesh(
      new THREE.ConeGeometry(50, 40, 32),
      farMountainMaterial
    );
    mountain7.position.set(-40, 0, -90);
    this.threeScene.add(mountain7);
    
    const mountain8 = new THREE.Mesh(
      new THREE.ConeGeometry(45, 38, 32),
      farMountainMaterial
    );
    mountain8.position.set(0, 0, 80);
    this.threeScene.add(mountain8);
    
    // Extra mountains on LEFT and LEFT-BACK for more coverage
    const mountain9 = new THREE.Mesh(
      new THREE.ConeGeometry(42, 36, 32),
      farMountainMaterial
    );
    mountain9.position.set(-45, 0, 0); // Far LEFT
    this.threeScene.add(mountain9);
    
    const mountain10 = new THREE.Mesh(
      new THREE.ConeGeometry(38, 33, 32),
      farMountainMaterial
    );
    mountain10.position.set(-50, 0, 40); // Far LEFT-BACK
    this.threeScene.add(mountain10);
    
    const mountain11 = new THREE.Mesh(
      new THREE.ConeGeometry(44, 37, 32),
      farMountainMaterial
    );
    mountain11.position.set(-55, 0, -40); // Very far LEFT
    this.threeScene.add(mountain11);
    
    const mountain12 = new THREE.Mesh(
      new THREE.ConeGeometry(36, 31, 32),
      nearMountainMaterial
    );
    mountain12.position.set(-30, 0, -15); // Further LEFT (away from tent)
    this.threeScene.add(mountain12);
  }
  
  private createCampChair(x: number, y: number, z: number) {
    const chairGroup = new THREE.Group();
    
    // Seat
    const seatGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.8);
    const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2c2c });
    const seat = new THREE.Mesh(seatGeometry, chairMaterial);
    seat.position.y = 0.4;
    chairGroup.add(seat);
    
    // Backrest
    const backGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
    const back = new THREE.Mesh(backGeometry, chairMaterial);
    back.position.set(0, 0.7, -0.35);
    chairGroup.add(back);
    
    // Legs (simplified)
    for (let i = 0; i < 4; i++) {
      const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4);
      const leg = new THREE.Mesh(legGeometry, chairMaterial);
      const xOffset = i % 2 === 0 ? -0.3 : 0.3;
      const zOffset = i < 2 ? -0.3 : 0.3;
      leg.position.set(xOffset, 0.2, zOffset);
      chairGroup.add(leg);
    }
    
    chairGroup.position.set(x, y, z);
    chairGroup.rotation.y = Math.PI / 6; // Angled toward fire
    this.threeScene.add(chairGroup);
  }
  
  private createSpaceNeedle() {
    this.spaceNeedle = new THREE.Group();
    
    // Base (tripod legs - simplified)
    const baseGeometry = new THREE.CylinderGeometry(0.15, 0.4, 4);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xb0b0b0 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 2;
    this.spaceNeedle.add(base);
    
    // Observation deck (UFO shape)
    const deckGeometry = new THREE.CylinderGeometry(1.2, 0.8, 0.6);
    const deckMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe0e0e0,
      emissive: 0xff6b35,
      emissiveIntensity: 0.2
    });
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.y = 5;
    this.spaceNeedle.add(deck);
    
    // Spire (antenna)
    const spireGeometry = new THREE.CylinderGeometry(0.05, 0.15, 4);
    const spireMaterial = new THREE.MeshStandardMaterial({ color: 0xd0d0d0 });
    const spire = new THREE.Mesh(spireGeometry, spireMaterial);
    spire.position.y = 8;
    this.spaceNeedle.add(spire);
    
    // Top tip
    const tipGeometry = new THREE.SphereGeometry(0.1);
    const tipMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red light
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.y = 10.2;
    this.spaceNeedle.add(tip);
    
    // Position to the right in the distance
    this.spaceNeedle.position.set(15, 0, -40);
    this.spaceNeedle.scale.set(3, 3, 3);
    
    this.threeScene.add(this.spaceNeedle);
    
    // Add Seattle city skyline (simple buildings)
    this.createSeattleSkyline();
  }
  
  private createSeattleSkyline() {
    // Create multiple buildings of varying heights
    const buildingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x404040,
      emissive: 0xffa500,
      emissiveIntensity: 0.1
    });
    
    // Array of building positions and sizes
    const buildings = [
      { x: 8, z: -35, width: 2, height: 8, depth: 2 },
      { x: 11, z: -38, width: 1.5, height: 6, depth: 1.5 },
      { x: 18, z: -42, width: 2.5, height: 10, depth: 2 },
      { x: 20, z: -36, width: 1.8, height: 7, depth: 1.8 },
      { x: 22, z: -40, width: 2, height: 9, depth: 2 },
      { x: 25, z: -45, width: 1.5, height: 5, depth: 1.5 },
      { x: 5, z: -40, width: 2, height: 7, depth: 2 },
    ];
    
    buildings.forEach(b => {
      const geometry = new THREE.BoxGeometry(b.width, b.height, b.depth);
      const building = new THREE.Mesh(geometry, buildingMaterial);
      building.position.set(b.x, b.height / 2, b.z);
      this.threeScene.add(building);
      
      // Windows (glowing dots)
      for (let i = 0; i < 3; i++) {
        const windowGeometry = new THREE.SphereGeometry(0.1);
        const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
          b.x + (Math.random() - 0.5) * b.width * 0.5,
          b.height * 0.3 + Math.random() * b.height * 0.4,
          b.z + b.depth / 2 + 0.1
        );
        this.threeScene.add(window);
      }
    });
  }

  update() {
    // Handle menus
    if (this.pauseMenu.isVisible() || this.helpMenu.isVisible()) {
      return;
    }
    
    const dt = this.game.loop.delta / 1000;
    
    // Player movement (WASD/Arrows)
    if (this.player) {
      const moveSpeed = 5;
      let moveX = 0;
      let moveZ = 0;
      
      if (this.controls.left.isDown) moveX -= 1;
      if (this.controls.right.isDown) moveX += 1;
      if (this.controls.up.isDown) moveZ -= 1;
      if (this.controls.down.isDown) moveZ += 1;
      
      // Normalize diagonal movement
      if (moveX !== 0 || moveZ !== 0) {
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        moveX /= length;
        moveZ /= length;
      }
      
      // Apply movement
      this.player.position.x += moveX * moveSpeed * dt;
      this.player.position.z += moveZ * moveSpeed * dt;
      
      // Jumping (SPACE key)
      if (Phaser.Input.Keyboard.JustDown(this.controls.jump) && !this.isJumping) {
        this.isJumping = true;
        this.jumpVelocity = 8;
      }
      
      // Apply gravity and jumping
      if (this.isJumping) {
        this.jumpVelocity -= 20 * dt;
        this.player.position.y += this.jumpVelocity * dt;
        
        if (this.player.position.y <= 1) {
          this.player.position.y = 1;
          this.isJumping = false;
          this.jumpVelocity = 0;
        }
      }
      
      // Keep player in bounds
      this.player.position.x = Math.max(-15, Math.min(15, this.player.position.x));
      this.player.position.z = Math.max(-10, Math.min(10, this.player.position.z));
    }
    
    // Update camera to follow player
    this.updateCameraPosition();
    
    // Animate fire (flicker effect)
    const fireObjects = this.threeScene.children.filter(obj => 
      obj instanceof THREE.Mesh && 
      (obj.material as any).emissive
    );
    fireObjects.forEach(obj => {
      const mesh = obj as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial;
      if (material.opacity !== undefined) {
        material.opacity = 0.7 + Math.sin(this.time.now / 100) * 0.2;
      }
    });
    
    // Render Three.js scene
    if (this.threeRenderer && this.threeScene && this.camera) {
      this.threeRenderer.render(this.threeScene, this.camera);
    }
    
    // Press ENTER to finish
    if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
      // Fade back to title (game complete!)
      fadeToScene(this, "Title", 2000);
    }
  }
  
  private updateCameraPosition() {
    if (!this.player) return;
    
    // Third-person camera behind and above player
    const camX = this.player.position.x + Math.sin(this.cameraAngleH) * this.cameraDistance;
    const camZ = this.player.position.z + Math.cos(this.cameraAngleH) * this.cameraDistance;
    const camY = this.player.position.y + 3 + Math.sin(this.cameraAngleV) * 2;
    
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.player.position.x, this.player.position.y + 1, this.player.position.z);
  }
  
  shutdown() {
    // Clean up Three.js resources
    if (this.threeRenderer) {
      if (this.threeRenderer.domElement.parentElement) {
        this.threeRenderer.domElement.parentElement.removeChild(this.threeRenderer.domElement);
      }
      this.threeRenderer.dispose();
    }
  }
}

