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
  private water!: THREE.Mesh;
  
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
    
    // Add debug axes for positioning
    this.addDebugAxes();
    
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
  
  private addDebugAxes() {
    // Add coordinate axes for easier positioning
    const axisLength = 20;
    
    // X axis (RED) - Left/Right
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]);
    const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Line(xGeometry, xMaterial);
    this.threeScene.add(xAxis);
    
    // Y axis (GREEN) - Up/Down
    const yGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Line(yGeometry, yMaterial);
    this.threeScene.add(yAxis);
    
    // Z axis (BLUE) - Forward/Back
    const zGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength)
    ]);
    const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Line(zGeometry, zMaterial);
    this.threeScene.add(zAxis);
    
    // Add grid on ground for reference
    const gridHelper = new THREE.GridHelper(40, 40, 0xffffff, 0x555555);
    gridHelper.position.y = 0.01; // Slightly above ground
    this.threeScene.add(gridHelper);
    
    // Add axis labels using Phaser text overlays
    this.add.text(320, 90, "← X (Red)", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ff0000"
    }).setOrigin(1, 0.5).setDepth(200);
    
    this.add.text(160, 10, "↑ Y (Green)", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#00ff00"
    }).setOrigin(0.5, 0).setDepth(200);
    
    this.add.text(10, 90, "Z (Blue) →", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#0000ff"
    }).setOrigin(0, 0.5).setDepth(200);
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
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x6B5D4F, // Brown dirt
      roughness: 0.9 
    });
    
    // One large ground plane covering everything
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120), // Large enough to cover entire scene
      groundMaterial
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0); // Centered at origin
    this.threeScene.add(ground);
    
    // Add scattered rocks on LEFT ground only (camping area)
    for (let i = 0; i < 15; i++) {
      const rockGeometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 6, 6);
      const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(
        -30 + Math.random() * 20, // Keep on left side only (x: -30 to -10)
        0.1,
        (Math.random() - 0.5) * 20
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
    
    // Add lake on right side (toward city)
    this.createLake();
    
    // Add trees around the camping area
    this.createForestTrees();
    
    // Camp chair facing fire
    this.createCampChair(-2, 0, 4);
  }
  
  private createLake() {
    // Simplified animated water without normal maps
    const waterGeometry = new THREE.PlaneGeometry(25, 35, 32, 32);
    const waterMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x5a8fb4, // Blue water
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85
    });
    this.water = new THREE.Mesh(waterGeometry, waterMaterial);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(10, 0.1, -15);
    this.threeScene.add(this.water);
    
    // Store geometry for wave animation
    this.water.userData.originalPositions = this.water.geometry.attributes.position.array.slice();
    
    // Add gray rocks along the shore (between ground and water)
    const numRocks = 30;
    for (let i = 0; i < numRocks; i++) {
      const rockSize = 0.2 + Math.random() * 0.5;
      const rockGeo = new THREE.SphereGeometry(rockSize, 6, 6);
      const rockMat = new THREE.MeshStandardMaterial({ 
        color: 0x707070 + Math.floor(Math.random() * 0x202020) // Varying grays
      });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      
      // Position along the shore (transition zone)
      const shoreX = -2 + Math.random() * 7; // Shore strip
      const shoreZ = -3 - Math.random() * 25; // Along lake edge
      
      rock.position.set(shoreX, rockSize * 0.5, shoreZ);
      rock.scale.set(1, 0.5 + Math.random() * 0.4, 1); // Flatten
      this.threeScene.add(rock);
    }
  }
  
  private createLake() {
    // ==================== EDIT LAKE CIRCLES HERE ====================
    // Each circle: { x: X_POSITION, z: Z_POSITION, radius: SIZE }
    // Lake is formed by overlapping these circles for organic shape
    const LAKE_CIRCLES = [
      { x: 10, z: -10, radius: 10 },   // Main body (further right)
      { x: 15, z: -15, radius: 8 },    // Extends right toward city
      { x: 8, z: -6, radius: 6 },       // At edge1 point (8, 2)
      { x: 5, z: -20, radius: 9 },     // Extends back (negative z)
      { x: -1, z: -12, radius: 6 },     // At edge2 point (-4, -7)
      { x: 20, z: 5, radius: 7 },      // Positive z extension
      { x: 18, z: -5, radius: 6 },     // Right extension
      { x: 10, z: 2, radius: 5 },       // Far positive z
      { x: -8, z: -20, radius: 15 },       // Left extension (near mountains)
      { x: -15, z: -30, radius: 20 }       // Left extension (near mountains)
    ];
    // ================================================================
    
    // Create organic lake from overlapping circles
    const waterCircles: THREE.Mesh[] = [];
    const circles = LAKE_CIRCLES;
    
    const basinMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a3a5f,
      emissive: 0x1a4d7f,
      emissiveIntensity: 0.4,
      roughness: 0.9
    });
    
    const waterMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x87CEEB,
      emissive: 0x4a90e2,
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.4,
      transparent: false
    });
    
    circles.forEach(circle => {
      // Basin circle (dark blue below)
      const basinGeo = new THREE.CircleGeometry(circle.radius, 32);
      const basinMesh = new THREE.Mesh(basinGeo, basinMaterial);
      basinMesh.rotation.x = -Math.PI / 2;
      basinMesh.position.set(circle.x, 0.01, circle.z);
      this.threeScene.add(basinMesh);
      
      // Water circle with subdivisions for waves
      const waterGeo = new THREE.CircleGeometry(circle.radius, 32);
      const waterMesh = new THREE.Mesh(waterGeo, waterMaterial);
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.set(circle.x, 0.05, circle.z); // Raised slightly above ground
      this.threeScene.add(waterMesh);
      
      // Store for animation
      waterMesh.userData.originalPositions = waterMesh.geometry.attributes.position.array.slice();
      waterCircles.push(waterMesh);
    });
    
    // Add large rectangular water to cover x=20 onwards
    const farWaterGeo = new THREE.PlaneGeometry(70, 80, 32, 32); // Large coverage
    const farWaterMesh = new THREE.Mesh(farWaterGeo, waterMaterial);
    farWaterMesh.rotation.x = -Math.PI / 2;
    farWaterMesh.position.set(50, 0.1, 20); // Centered at x=50, covers x=20 to x=80
    this.threeScene.add(farWaterMesh);
    farWaterMesh.userData.originalPositions = farWaterMesh.geometry.attributes.position.array.slice();
    waterCircles.push(farWaterMesh);
    
    // Basin under far water
    const farBasinGeo = new THREE.PlaneGeometry(70, 80);
    const farBasinMesh = new THREE.Mesh(farBasinGeo, basinMaterial);
    farBasinMesh.rotation.x = -Math.PI / 2;
    farBasinMesh.position.set(50, 0.01, 20);
    this.threeScene.add(farBasinMesh);
    
    // Add another rectangle at z=-50 from x=10 onwards
    const backWaterGeo = new THREE.PlaneGeometry(70, 20, 32, 32); // Width 70, height 20
    const backWaterMesh = new THREE.Mesh(backWaterGeo, waterMaterial);
    backWaterMesh.rotation.x = -Math.PI / 2;
    backWaterMesh.position.set(45, 0.1, -20); // Centered at x=45 (covers x=10 to x=80), z=-50
    this.threeScene.add(backWaterMesh);
    backWaterMesh.userData.originalPositions = backWaterMesh.geometry.attributes.position.array.slice();
    waterCircles.push(backWaterMesh);
    
    // Basin under back water
    const backBasinGeo = new THREE.PlaneGeometry(70, 20);
    const backBasinMesh = new THREE.Mesh(backBasinGeo, basinMaterial);
    backBasinMesh.rotation.x = -Math.PI / 2;
    backBasinMesh.position.set(45, 0.01, -20);
    this.threeScene.add(backBasinMesh);
    
    // Store all water circles for animation
    this.water = waterCircles[0]; // Main reference (for compatibility)
    (this.water as any).allCircles = waterCircles;
  }
  
  private createForestTrees() {
    // Create MANY pine trees - LEFT side and behind camp ONLY
    // City/Space Needle is on the RIGHT (+x direction, -z)
    // Keep that view completely clear!
    
    const treeCount = 50;
    const treePositions: {x: number, z: number, height: number}[] = [];
    
    // FIXED TREES for hammock area
    const hammockTree1 = { x: -4, z: 7 }; // Further back
    const hammockTree2 = { x: -7, z: 4 }; // Next to tent area
    
    // Create the two fixed trees first (marked with bright foliage for visibility)
    [hammockTree1, hammockTree2].forEach((pos, idx) => {
      const height = 10;
      
      // Trunk
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, height);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a0f });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(pos.x, height / 2, pos.z);
      this.threeScene.add(trunk);
      
      // Foliage (brighter green to mark hammock trees)
      const foliageGeometry = new THREE.ConeGeometry(1.5, 5, 8);
      const foliageMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3a7d3a, // Brighter green for hammock trees
        emissive: 0x1a4d2e,
        emissiveIntensity: 0.3
      });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.set(pos.x, height - 1, pos.z);
      this.threeScene.add(foliage);
      
      // Add marker sphere at attachment point
      const markerGeometry = new THREE.SphereGeometry(0.2);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0xff0000 : 0xffff00 });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(pos.x, 3, pos.z); // Attachment height
      this.threeScene.add(marker);
      
      treePositions.push({x: pos.x, z: pos.z, height});
    });
    
    // Now create random trees
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
      
      // Skip if in hammock area (protect area between the two fixed trees)
      const distToHammock1 = Math.sqrt((x - hammockTree1.x) * (x - hammockTree1.x) + (z - hammockTree1.z) * (z - hammockTree1.z));
      const distToHammock2 = Math.sqrt((x - hammockTree2.x) * (x - hammockTree2.x) + (z - hammockTree2.z) * (z - hammockTree2.z));
      if (distToHammock1 < 3 || distToHammock2 < 3) continue;
      
      // Skip if in lake area (8, -6, radius 6)
      const distToLake = Math.sqrt((x - 8) * (x - 8) + (z + 6) * (z + 6));
      if (distToLake < 7) continue; // 6 + 1 buffer
      
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
      
      // Save position
      treePositions.push({x, z, height});
    }
    
    // Find and log 5 closest trees to center (campfire at 0, 2)
    const centerX = 0, centerZ = 2;
    const sorted = treePositions
      .map(t => ({
        ...t,
        dist: Math.sqrt((t.x - centerX) * (t.x - centerX) + (t.z - centerZ) * (t.z - centerZ))
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);
    
    console.log("5 Closest trees to campfire:");
    sorted.forEach((t, i) => {
      console.log(`  Tree ${i + 1}: x=${t.x.toFixed(1)}, z=${t.z.toFixed(1)}, dist=${t.dist.toFixed(1)}`);
    });
    
    // Add mountain backdrop on LEFT and behind
    this.createMountainBackdrop();
    
    // Create hammock between the two fixed trees
    this.createHammock(hammockTree1.x, hammockTree1.z, hammockTree2.x, hammockTree2.z);
  }
  
  private createHammock(x1: number, z1: number, x2: number, z2: number) {
    const hammockGroup = new THREE.Group();
    
    // Create hammock curve - stop short of trees to show rope attachment
    const gapDistance = 0.5; // Stop 0.5 units before each tree (medium gap for rope)
    const direction = { 
      x: x2 - x1, 
      z: z2 - z1 
    };
    const totalDist = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    const normDir = { x: direction.x / totalDist, z: direction.z / totalDist };
    
    // Hammock endpoints (with gap)
    const hammockStart = {
      x: x1 + normDir.x * gapDistance,
      z: z1 + normDir.z * gapDistance
    };
    const hammockEnd = {
      x: x2 - normDir.x * gapDistance,
      z: z2 - normDir.z * gapDistance
    };
    const hammockMid = {
      x: (hammockStart.x + hammockEnd.x) / 2,
      z: (hammockStart.z + hammockEnd.z) / 2
    };
    
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hammockStart.x, 1.7, hammockStart.z),
      new THREE.Vector3(hammockMid.x, 0.9, hammockMid.z), // Sag in middle
      new THREE.Vector3(hammockEnd.x, 1.7, hammockEnd.z)
    ]);
    
    // Create tapered hammock with varying sphere sizes along curve
    const numSpheres = 40;
    for (let i = 0; i <= numSpheres; i++) {
      const t = i / numSpheres;
      const point = curve.getPoint(t);
      
      // Taper: very thin at ends, thick in middle
      const taper = Math.sin(t * Math.PI);
      const radius = 0.05 + taper * 0.18; // 0.05 at ends, 0.23 in middle
      
      const sphereGeo = new THREE.SphereGeometry(radius, 8, 8);
      const sphereMat = new THREE.MeshStandardMaterial({ 
        color: 0x5cb85c,
        roughness: 0.7
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(point);
      hammockGroup.add(sphere);
    }
    
    // Add red and yellow stripes with same tapering as hammock
    const numStripeSegments = 40;
    
    // Red stripe (top edge)
    for (let i = 0; i <= numStripeSegments; i++) {
      const t = i / numStripeSegments;
      const point = curve.getPoint(t);
      
      const taper = Math.sin(t * Math.PI);
      const hammockRadius = 0.05 + taper * 0.18;
      const stripeRadius = 0.03; // Small stripe
      
      const redSphereGeo = new THREE.SphereGeometry(stripeRadius, 6, 6);
      const redSphereMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const redSphere = new THREE.Mesh(redSphereGeo, redSphereMat);
      redSphere.position.set(point.x, point.y + hammockRadius + 0.02, point.z);
      hammockGroup.add(redSphere);
    }
    
    // Yellow stripe (bottom edge)
    for (let i = 0; i <= numStripeSegments; i++) {
      const t = i / numStripeSegments;
      const point = curve.getPoint(t);
      
      const taper = Math.sin(t * Math.PI);
      const hammockRadius = 0.05 + taper * 0.18;
      const stripeRadius = 0.03;
      
      const yellowSphereGeo = new THREE.SphereGeometry(stripeRadius, 6, 6);
      const yellowSphereMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const yellowSphere = new THREE.Mesh(yellowSphereGeo, yellowSphereMat);
      yellowSphere.position.set(point.x, point.y - hammockRadius - 0.02, point.z);
      hammockGroup.add(yellowSphere);
    }
    
    // Beige rope (Tree 1 to hammock end) - curved
    const rope1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x1, 3, z1), // Tree attachment (high)
      new THREE.Vector3(x1 + normDir.x * 0.3, 2.2, z1 + normDir.z * 0.3), // Slight arc
      new THREE.Vector3(hammockStart.x, 1.7, hammockStart.z) // Hammock end
    ]);
    const rope1Geo = new THREE.TubeGeometry(rope1Curve, 8, 0.04, 4, false);
    const ropeMat = new THREE.MeshBasicMaterial({ color: 0xd2b48c }); // Beige/tan
    const rope1 = new THREE.Mesh(rope1Geo, ropeMat);
    hammockGroup.add(rope1);
    
    // Beige rope (Tree 2 to hammock end) - curved
    const rope2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x2, 3, z2), // Tree attachment (high)
      new THREE.Vector3(x2 - normDir.x * 0.3, 2.2, z2 - normDir.z * 0.3), // Slight arc
      new THREE.Vector3(hammockEnd.x, 1.7, hammockEnd.z) // Hammock end
    ]);
    const rope2Geo = new THREE.TubeGeometry(rope2Curve, 8, 0.04, 4, false);
    const rope2 = new THREE.Mesh(rope2Geo, ropeMat);
    hammockGroup.add(rope2);
    
    this.threeScene.add(hammockGroup);
    
    console.log(`Hammock created between (${x1}, ${z1}) and (${x2}, ${z2})`);
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
    
    // Metal frame material (dark gray/black)
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2c2c });
    
    // Fabric material (dark blue/gray)
    const fabricMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x34495e,
      roughness: 0.8
    });
    
    // Frame - front legs (X shape when viewed from side)
    const frontLegLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.9),
      frameMaterial
    );
    frontLegLeft.position.set(-0.3, 0.45, 0.2);
    frontLegLeft.rotation.z = 0.2;
    chairGroup.add(frontLegLeft);
    
    const frontLegRight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.9),
      frameMaterial
    );
    frontLegRight.position.set(0.3, 0.45, 0.2);
    frontLegRight.rotation.z = -0.2;
    chairGroup.add(frontLegRight);
    
    // Frame - back legs
    const backLegLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.2),
      frameMaterial
    );
    backLegLeft.position.set(-0.3, 0.6, -0.2);
    backLegLeft.rotation.z = 0.15;
    backLegLeft.rotation.x = -0.2;
    chairGroup.add(backLegLeft);
    
    const backLegRight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.2),
      frameMaterial
    );
    backLegRight.position.set(0.3, 0.6, -0.2);
    backLegRight.rotation.z = -0.15;
    backLegRight.rotation.x = -0.2;
    chairGroup.add(backLegRight);
    
    // Seat fabric (curved slightly)
    const seatGeometry = new THREE.PlaneGeometry(0.7, 0.6, 8, 4);
    const seat = new THREE.Mesh(seatGeometry, fabricMaterial);
    seat.rotation.x = -Math.PI / 2 - 0.2; // Angled back slightly
    seat.position.set(0, 0.45, 0);
    chairGroup.add(seat);
    
    // Backrest fabric
    const backGeometry = new THREE.PlaneGeometry(0.7, 0.8);
    const back = new THREE.Mesh(backGeometry, fabricMaterial);
    back.position.set(0, 0.8, -0.3);
    back.rotation.x = -0.15; // Slight recline
    chairGroup.add(back);
    
    chairGroup.position.set(x, y, z);
    
    // Calculate rotation to face the fire (at 0, 0, 2)
    const fireX = 0, fireZ = 2;
    const angleToFire = Math.atan2(fireX - x, fireZ - z);
    chairGroup.rotation.y = angleToFire;
    
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
    
    // Update water animation for all circles
    if (this.water && (this.water as any).allCircles) {
      const waterCircles = (this.water as any).allCircles as THREE.Mesh[];
      const time = this.time.now / 1000;
      
      waterCircles.forEach(waterMesh => {
        if (waterMesh.geometry) {
          const positions = waterMesh.geometry.attributes.position;
          const originalPositions = waterMesh.userData.originalPositions;
          
          for (let i = 0; i < positions.count; i++) {
            const x = originalPositions[i * 3];
            const y = originalPositions[i * 3 + 1];
            
            // Create wave pattern
            const wave1 = Math.sin(x * 0.5 + time) * 0.05;
            const wave2 = Math.sin(y * 0.3 + time * 1.3) * 0.03;
            const wave3 = Math.sin((x + y) * 0.4 + time * 0.8) * 0.04;
            
            positions.setZ(i, wave1 + wave2 + wave3);
          }
          
          positions.needsUpdate = true;
          waterMesh.geometry.computeVertexNormals();
        }
      });
    }
    
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

