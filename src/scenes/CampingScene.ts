import Phaser from "phaser";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { initializeGameScene } from "../utils/sceneSetup";
import { fadeToScene } from "../utils/sceneTransitions";
import { DEBUG_SHOW_GRID } from "../config/debug";
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
  private airplane!: THREE.Group;
  
  // Player character
  private player!: THREE.Mesh;
  private isJumping = false;
  private jumpVelocity = 0;
  private walkAnimTime = 0;
  
  // Character parts for animation
  private leftLeg!: THREE.Mesh;
  private rightLeg!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  
  // Fire interaction
  private ouchText?: Phaser.GameObjects.Text;
  
  // Camera controls
  private cameraAngleH = Math.PI / 3; // Start facing right (toward city)
  private cameraAngleV = 0.1; // Nearly horizontal (slight upward tilt)
  private cameraDistance = 6; // Medium distance
  private cameraHeightOffset = 4; // Higher above player (compensate for y=0)
  
  // Mouse tracking for delta
  private lastMouseX = 160;
  private lastMouseY = 90;

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
    
    // Add debug axes for positioning (controlled by config)
    if (DEBUG_SHOW_GRID) {
      this.addDebugAxes();
    }
    
    // Set up mouse controls
    this.setupMouseControls();
    
    // Overlay text removed for clean view
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
    gradient.addColorStop(0, '#4a2a5a'); // Dark purple top
    gradient.addColorStop(0.2, '#FF6B9D'); // Pink
    gradient.addColorStop(0.5, '#FFA500'); // Orange middle
    gradient.addColorStop(0.75, '#FFD700'); // Golden
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
    sunlight.position.set(20, 4, -25); // Opposite x (was -10, now +10)
    this.threeScene.add(sunlight);
    
    // Add stars in the sky
    this.createStars();
    
    // Add airplane flying in distance
    this.createAirplane();
  }
  
  private createAirplane() {
    // Load airplane GLB model
    const airplaneLoader = new GLTFLoader();
    airplaneLoader.load(
      '1400_boeing_737_airplane_for_free.glb',
      (gltf) => {
        this.airplane = gltf.scene;
        
        // Remove stand/base and brighten materials
        const toRemove: THREE.Object3D[] = [];
        this.airplane.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            
            // Check if this is the stand (usually at bottom, flat)
            const bbox = new THREE.Box3().setFromObject(mesh);
            const size = bbox.getSize(new THREE.Vector3());
            
            // If it's very flat (stand/base), mark for removal
            if (size.y < size.x * 0.1 || mesh.name.toLowerCase().includes('stand') || mesh.name.toLowerCase().includes('base')) {
              toRemove.push(mesh);
            } else if (mesh.material) {
              // Bright airplane - clearly visible
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.color = new THREE.Color(0xdddddd); // Light gray/white
              mat.emissive = new THREE.Color(0xaaaaaa); // Bright glow
              mat.emissiveIntensity = 0.25;
            }
          }
        });
        
        // Remove stand pieces
        toRemove.forEach(obj => obj.parent?.remove(obj));
        
        // Position back behind city at horizon
        this.airplane.position.set(-80, 30, -70); // Behind city skyline
        const scale = 0.3
        this.airplane.scale.set(scale, scale, scale);
        this.airplane.rotation.y = Math.PI / 2; // Flying left to right
        
        this.threeScene.add(this.airplane);
        console.log("Airplane GLB loaded - scale 0.5");
      },
      undefined,
      (error) => console.error("Airplane load error:", error)
    );
  }
  
  private createStars() {
    // Create many bright stars scattered across the sky
    const starCount = 400;
    
    for (let i = 0; i < starCount; i++) {
      // Random position - spread across sky above horizon
      const x = (Math.random() - 0.5) * 100;
      const y = 20 + Math.random() * 5; // High in sky (y=20 to y=60)
      const z = (Math.random() - 0.5) * 100;
      
      // Create each star as a bright glowing sphere
      const starSize = 0.1 + Math.random() * 0.2; // Bigger
      const starGeo = new THREE.SphereGeometry(starSize, 8, 8);
      const starMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffee, // Warm white
        fog: false // Don't let fog affect stars
      });
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(x, y, z);
      this.threeScene.add(star);
    }
    
    console.log("Stars created - look up to see them!");
  }
  
  private createPlayer() {
    // Improved Grayson character - colors resist warm lighting
    this.player = new THREE.Group() as any;
    this.player.position.set(-2, 0, 2); // Start near tent
    
    // Shoes/feet (dark brown)
    const shoeMat = new THREE.MeshStandardMaterial({ 
      color: 0x3e2723,
      emissive: 0x3e2723,
      emissiveIntensity: 0.2
    });
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), shoeMat);
    leftShoe.position.set(-0.15, 0.08, 0);
    this.player.add(leftShoe);
    
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), shoeMat);
    rightShoe.position.set(0.15, 0.08, 0);
    this.player.add(rightShoe);
    
    // Legs (brown pants) - store for animation
    const pantsMat = new THREE.MeshStandardMaterial({ 
      color: 0x6b4423,
      emissive: 0x6b4423,
      emissiveIntensity: 0.15
    });
    this.leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6), pantsMat);
    this.leftLeg.position.set(-0.15, 0.5, 0);
    this.player.add(this.leftLeg);
    
    this.rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6), pantsMat);
    this.rightLeg.position.set(0.15, 0.5, 0);
    this.player.add(this.rightLeg);
    
    // Torso (bright green shirt)
    const shirtMat = new THREE.MeshStandardMaterial({ 
      color: 0x81c784,
      emissive: 0x81c784,
      emissiveIntensity: 0.2
    });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), shirtMat);
    torso.position.set(0, 1.15, 0);
    this.player.add(torso);
    
    // Arms (skin tone) - store for animation
    const armMat = new THREE.MeshStandardMaterial({ 
      color: 0xffe5cc,
      emissive: 0xffe5cc,
      emissiveIntensity: 0.15
    });
    this.leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6), armMat);
    this.leftArm.position.set(-0.3, 1.1, 0);
    this.player.add(this.leftArm);
    
    this.rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6), armMat);
    this.rightArm.position.set(0.3, 1.1, 0);
    this.player.add(this.rightArm);
    
    // Head (skin tone) - smaller so cap covers it
    const headMat = new THREE.MeshStandardMaterial({ 
      color: 0xffe5cc,
      emissive: 0xffe5cc,
      emissiveIntensity: 0.15
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), headMat);
    head.position.set(0, 1.65, 0);
    this.player.add(head);
    
    // Blonde hair (back of head)
    const hairMat = new THREE.MeshStandardMaterial({ 
      color: 0xf4d03f, // Blonde
      emissive: 0xf4d03f,
      emissiveIntensity: 0.2
    });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), hairMat);
    hair.position.set(0, 1.68, -0.15); // Back of head
    hair.scale.set(0.8, 1, 0.6); // Flatten to look like hair
    this.player.add(hair);
    
    // Cap (blue - covers head properly)
    const capMat = new THREE.MeshStandardMaterial({ 
      color: 0x2196f3, // Blue (not cyan)
      emissive: 0x2196f3,
      emissiveIntensity: 0.25
    });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    cap.position.set(0, 1.75, 0);
    this.player.add(cap);
    
    // Cap brim
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), capMat);
    brim.position.set(0, 1.68, 0.08); // Slightly forward
    this.player.add(brim);
    
    this.threeScene.add(this.player);
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
    
    // Axis labels removed for clean view
  }
  
  private setupMouseControls() {
    // Track mouse movement for camera rotation (accumulates, allows 360°)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Calculate delta from last position
      const deltaX = pointer.x - this.lastMouseX;
      const deltaY = pointer.y - this.lastMouseY;
      
      // Accumulate rotation (allows full 360° rotation!)
      this.cameraAngleH -= deltaX * 0.03; // Horizontal rotation (3x more sensitive)
      this.cameraAngleV += deltaY * 0.02; // Vertical rotation (increased)
      
      // Clamp vertical rotation (allow more tilt up/down)
      this.cameraAngleV = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.cameraAngleV));
      
      // Update last position
      this.lastMouseX = pointer.x;
      this.lastMouseY = pointer.y;
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
    
    // Load tent 3D model
    const tentLoader = new GLTFLoader();
    tentLoader.load(
      'tent.glb',
      (gltf) => {
        const tentModel = gltf.scene;
        tentModel.position.set(-7, 0, 1); // Left side of camp
        tentModel.scale.set(0.015, 0.015, 0.015); // Much smaller (GLB is huge!)
        tentModel.rotation.y = 0; // Adjust rotation if needed
        this.threeScene.add(tentModel);
        console.log("Tent 3D model loaded! Scale:", tentModel.scale);
      },
      undefined,
      (error) => {
        console.error("Error loading tent model:", error);
      }
    );
    
    // Load campfire 3D model
    const fireLoader = new GLTFLoader();
    fireLoader.load(
      'low_poly_campfire.glb',
      (gltf) => {
        const fireModel = gltf.scene;
        fireModel.position.set(0, 0.1, 2); // Center of camp
        fireModel.scale.set(0.1, 0.1, 0.1); // Adjust as needed
        fireModel.rotation.y = 0;
        this.threeScene.add(fireModel);
        console.log("Campfire 3D model loaded!");
      },
      undefined,
      (error) => {
        console.error("Error loading campfire model:", error);
      }
    );
    
    // Add lake on right side (toward city)
    this.createLake();
    
    // Add trees around the camping area
    this.createForestTrees();
    
    // Camp chair facing fire
    this.createCampChair(-3, 0.5, 4.5);
  }
  
  private createLake() {
    // ==================== EDIT LAKE CIRCLES HERE ====================
    // Each circle: { x: X_POSITION, z: Z_POSITION, radius: SIZE }
    // Lake is formed by overlapping these circles for organic shape
    const LAKE_CIRCLES = [
      { x: 10, z: -10, radius: 10 },   // Main body (further right)
      { x: 15, z: -15, radius: 8 },    // Extends right toward city
      { x: 8, z: -6, radius: 6 },       // At edge1 point (8, 2)
      { x: 5, z: -22, radius: 9 },     // Extends back (negative z)
      { x: -1, z: -12, radius: 10 },     // At edge2 point (-4, -7)
      { x: 20, z: 5, radius: 7 },      // Positive z extension
      { x: 18, z: -5, radius: 6 },     // Right extension
      { x: 10, z: -6, radius: 10 },       // Far positive z
      { x: -8, z: -10, radius: 8 },       // Left extension (near mountains)
      { x: -10, z: -20, radius: 10 }       // Left extension (near mountains)
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
    [hammockTree1, hammockTree2].forEach((pos) => {
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
      
      treePositions.push({x: pos.x, z: pos.z, height});
    });
    
    // Now create random trees
    for (let i = 0; i < treeCount; i++) {
      // Random position - focus on LEFT and BEHIND
      let x = -5 - Math.random() * 20; // LEFT side only (negative x)
      let z = -4 + Math.random() * 19; // From z=-4 to z=15 (not past -4)
      
      // Also add some trees behind the camp
      if (Math.random() < 0.3) {
        x = (Math.random() - 0.5) * 30; // Can be anywhere horizontally
        z = 5 + Math.random() * 20; // But must be BEHIND (positive z)
      }
      
      // Ensure z doesn't go below -4
      if (z < -4) z = -4 + Math.random() * 4;
      
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
    
    // Add water beyond the city (right side)
    this.createDistantWater();
    
    // Add distant mountain range with snow (far horizon)
    this.createDistantMountains();
    
    // Add Mt. Rainier at horizon corner
    this.loadMtRainier();
    
    // Add shoreline rocks along the water edge
    this.createShorelineRocks();
    
    // Create hammock between the two fixed trees
    this.createHammock(hammockTree1.x, hammockTree1.z, hammockTree2.x, hammockTree2.z);
  }
  
  private loadMtRainier() {
    // Load Mt. Rainier model at the corner of horizon lines
    const rainierLoader = new GLTFLoader();
    rainierLoader.load(
      'mount_rainier.glb',
      (gltf) => {
        const mtRainier = gltf.scene;
        
        // Position at corner where diagonal and right horizon lines meet
        mtRainier.position.set(80, -5, -80); // Corner position
        const scale = 1.8
        mtRainier.scale.set(scale, scale, scale); // Prominent feature
        mtRainier.rotation.y = 30;
        
        // Make mountain darker
        mtRainier.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              // Slightly darken the original color
              mat.color.multiplyScalar(0.98); // 85% of original brightness (subtle darkening)
              mat.emissive = new THREE.Color(0x000000); // No glow
              mat.emissiveIntensity = 0;
            }
          }
        });
        
        this.threeScene.add(mtRainier);
        console.log("Mt. Rainier loaded at horizon corner!");
      },
      undefined,
      (error) => console.error("Error loading Mt. Rainier:", error)
    );
  }
  
  private createDistantMountains() {
    // Far distant mountains beyond city - creates horizon
    const distantMountainMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a3a5a, // Dark blue (distant atmosphere)
      roughness: 0.8
    });
    
    const snowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe0e8f0, // White-blue snow
      emissive: 0xffffff,
      emissiveIntensity: 0.1,
      roughness: 0.6
    });
    
    const baseY = 0;
    
    // Diagonal horizon - stops before Mt. Rainier
    const mountains = [
      { x: -10, z: -65, radius: 8, height: 10 },
      { x: 0, z: -65, radius: 10, height: 8 },
      { x: 10, z: -63, radius: 6, height: 5 },
      { x: 17, z: -65, radius: 8, height: 6 },
      { x: 25, z: -62, radius: 7, height: 4 },
      { x: 40, z: -68, radius: 10, height: 5 },
      // { x: 40, z: -60, radius: 5, height: 4 },
      // { x: 50, z: -61, radius: 6, height: 5 }
      // Removed x=60 and x=70 to clear space for Mt. Rainier
    ];
    
    // Right-side horizon - skips Mt. Rainier area
    const rightHorizonX = 85; // Right side horizon
    const rightMountains = [
      // Skip z=-60 (too close to Mt. Rainier at z=-70)
      { x: rightHorizonX, z: -50, radius: 4, height: 3 },
      { x: rightHorizonX, z: -40, radius: 6, height: 5 },
      { x: rightHorizonX, z: -30, radius: 5, height: 4 },
      { x: rightHorizonX, z: -20, radius: 4, height: 3 },
      { x: rightHorizonX, z: -10, radius: 5, height: 4 },
      { x: rightHorizonX, z: 0, radius: 6, height: 5 },
      { x: rightHorizonX, z: 10, radius: 4, height: 3 },
      { x: rightHorizonX, z: 20, radius: 5, height: 4 },
      { x: rightHorizonX, z: 30, radius: 4, height: 3 },
      { x: rightHorizonX, z: 40, radius: 6, height: 5 },
      { x: rightHorizonX, z: 50, radius: 5, height: 4 }
    ];
    
    // Combine both mountain lines
    const allMountains = [...mountains, ...rightMountains];
    
    allMountains.forEach(m => {
      // Mountain body (dark)
      const mountainGeo = new THREE.ConeGeometry(m.radius, m.height, 32);
      const mountain = new THREE.Mesh(mountainGeo, distantMountainMaterial);
      mountain.position.set(m.x, baseY + m.height / 2, m.z);
      this.threeScene.add(mountain);
      
      // Snow cap (top 30% of mountain)
      const snowCapHeight = m.height * 0.3;
      const snowCapRadius = m.radius * 0.3; // Narrower at top
      const snowGeo = new THREE.ConeGeometry(snowCapRadius, snowCapHeight, 32);
      const snowCap = new THREE.Mesh(snowGeo, snowMaterial);
      snowCap.position.set(m.x, baseY + m.height - snowCapHeight / 2, m.z);
      this.threeScene.add(snowCap);
    });
  }
  
  private createDistantWater() {
    // Water area beyond city (right side)
    // x: 30 to 70, z: -25 to -50
    
    const waterMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x87CEEB,
      emissive: 0x4a90e2,
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.4,
      transparent: false
    });
    
    const basinMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a3a5f,
      emissive: 0x1a4d7f,
      emissiveIntensity: 0.4,
      roughness: 0.9
    });
    
    // Water plane in that area
    const distantWaterGeo = new THREE.PlaneGeometry(40, 40, 32, 32); // Width 40, depth 25
    const distantWater = new THREE.Mesh(distantWaterGeo, waterMaterial);
    distantWater.rotation.x = -Math.PI / 2;
    distantWater.position.set(60, 0.1, -40); // Centered at x=50, z=-37.5
    this.threeScene.add(distantWater);
    distantWater.userData.originalPositions = distantWater.geometry.attributes.position.array.slice();
    
    // Basin
    const distantBasin = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      basinMaterial
    );
    distantBasin.rotation.x = -Math.PI / 2;
    distantBasin.position.set(60, 0.01, -40);
    this.threeScene.add(distantBasin);
    
    // Add corner circle to smooth the transition between back water and distant water
    const cornerRadius = 15;
    const cornerWaterGeo = new THREE.CircleGeometry(cornerRadius, 32);
    const cornerWater = new THREE.Mesh(cornerWaterGeo, waterMaterial);
    cornerWater.rotation.x = -Math.PI / 2;
    cornerWater.position.set(40, 0.1, -30); // Correct corner (between backWater z=-20 and distantWater z=-40)
    this.threeScene.add(cornerWater);
    cornerWater.userData.originalPositions = cornerWater.geometry.attributes.position.array.slice();
    
    // Corner basin
    const cornerBasin = new THREE.Mesh(
      new THREE.CircleGeometry(cornerRadius, 32),
      basinMaterial
    );
    cornerBasin.rotation.x = -Math.PI / 2;
    cornerBasin.position.set(55, 0.01, -30);
    this.threeScene.add(cornerBasin);
    
    // Add to animation
    if (this.water && (this.water as any).allCircles) {
      (this.water as any).allCircles.push(distantWater);
      (this.water as any).allCircles.push(cornerWater);
    }
  }
  
  private createShorelineRocks() {
    // Add gray rocks along shore (ground side only, not in water)
    const numRocks = 100;
    
    // Shore edge points
    const edge1 = { x: 15, z: 2 };
    const edge2 = { x: -13, z: -7 };
    
    for (let i = 0; i < numRocks; i++) {
      // Position along the shore line
      const t = i / numRocks; // Evenly distributed along shore
      const baseX = edge1.x + (edge2.x - edge1.x) * t;
      const baseZ = edge1.z + (edge2.z - edge1.z) * t;
      
      // Offset toward camping ground (away from water)
      const perpX = -(edge2.z - edge1.z); // Perpendicular to shore
      const perpZ = (edge2.x - edge1.x);
      const perpLength = Math.sqrt(perpX * perpX + perpZ * perpZ);
      
      // Place on ground side with scatter
      const offset = -1 - Math.random() * 3; // -1 to -3 units toward ground
      const x = baseX + (perpX / perpLength) * offset;
      const z = baseZ + (perpZ / perpLength) * offset;
      
      // Skip if too close to camp objects
      const distToFire = Math.sqrt(x * x + (z - 2) * (z - 2));
      const distToTent = Math.sqrt((x + 8) * (x + 8) + z * z);
      if (distToFire < 3.5 || distToTent < 3.5) continue;
      
      // Create gray rock using MeshBasicMaterial (unaffected by lighting)
      const rockSize = 0.3 + Math.random() * 0.5;
      const rockGeo = new THREE.SphereGeometry(rockSize, 8, 8);
      
      // Pick from actual gray colors (not hex math!)
      const grayColors = [0x505050, 0x606060, 0x707070, 0x808080, 0x909090, 0x5a5a5a, 0x6a6a6a];
      const grayShade = grayColors[Math.floor(Math.random() * grayColors.length)];
      
      const rockMat = new THREE.MeshBasicMaterial({ 
        color: grayShade // True gray
      });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(x, rockSize * 0.4, z);
      rock.scale.set(1, 0.5 + Math.random() * 0.3, 1); // Flatten
      this.threeScene.add(rock);
    }
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
    // Load camping chair 3D model
    const loader = new GLTFLoader();
    loader.load(
      'camping_chair.glb',
      (gltf) => {
        const chairModel = gltf.scene;
        
        // Position and scale
        chairModel.position.set(x, y, z);
        chairModel.scale.set(1.5, 1.5, 1.5); // Adjust scale as needed
        
        // Calculate rotation to face opposite direction (away from fire)
        const fireX = 0, fireZ = 2;
        const angleToFire = Math.atan2(fireX - x, fireZ - z);
        chairModel.rotation.y = angleToFire + Math.PI; // Add 180 degrees
        
        this.threeScene.add(chairModel);
        console.log("Camping chair 3D model loaded!");
      },
      undefined,
      (error) => {
        console.error("Error loading camping chair model:", error);
        // Fallback: use simple chair
        this.createSimpleChair(x, y, z);
      }
    );
  }
  
  private createSimpleChair(x: number, y: number, z: number) {
    // Simple fallback chair
    const chairGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c });
    
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), frameMat);
    seat.position.y = 0.4;
    chairGroup.add(seat);
    
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), frameMat);
    back.position.set(0, 0.7, -0.35);
    chairGroup.add(back);
    
    chairGroup.position.set(x, y, z);
    
    const fireX = 0, fireZ = 2;
    const angleToFire = Math.atan2(fireX - x, fireZ - z);
    chairGroup.rotation.y = angleToFire;
    
    this.threeScene.add(chairGroup);
  }
  
  private createSpaceNeedle() {
    // Load actual Space Needle 3D model
    const loader = new GLTFLoader();
    loader.load(
      'space_needle.glb',
      (gltf) => {
        this.spaceNeedle = gltf.scene;
        
        // Lighten the Space Needle materials
        this.spaceNeedle.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              // Lighten the color
              if (mat.color) {
                mat.color.multiplyScalar(1.8); // Brighten by 80%
              }
              // Add slight emissive glow
              mat.emissive = new THREE.Color(0x9090a0);
              mat.emissiveIntensity = 0.2;
            }
          }
        });
        
        // Position and scale the model
        this.spaceNeedle.position.set(12, 0, -35);
        this.spaceNeedle.scale.set(0.08, 0.08, 0.08);
        
        // Rotate if needed
        this.spaceNeedle.rotation.y = 0;
        
        this.threeScene.add(this.spaceNeedle);
        console.log("Space Needle 3D model loaded!");
      },
      (progress) => {
        // Loading progress
        console.log(`Loading Space Needle: ${(progress.loaded / progress.total * 100).toFixed(0)}%`);
      },
      (error) => {
        console.error("Error loading Space Needle model:", error);
        // Fallback: create simple placeholder
        this.createSimpleSpaceNeedle();
      }
    );
    
    // Add Seattle city skyline (simple buildings)
    this.createSeattleSkyline();
  }
  
  private createSimpleSpaceNeedle() {
    // Fallback simple Space Needle if model fails to load
    this.spaceNeedle = new THREE.Group();
    
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xb0b0b0 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 4), baseMaterial);
    base.position.y = 2;
    this.spaceNeedle.add(base);
    
    const deckMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe0e0e0,
      emissive: 0xff6b35,
      emissiveIntensity: 0.2
    });
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.8, 0.6), deckMaterial);
    deck.position.y = 5;
    this.spaceNeedle.add(deck);
    
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.15, 4), baseMaterial);
    spire.position.y = 8;
    this.spaceNeedle.add(spire);
    
    this.spaceNeedle.position.set(15, 0, -40);
    this.spaceNeedle.scale.set(3, 3, 3);
    this.threeScene.add(this.spaceNeedle);
  }
  
  private createSeattleSkyline() {
    // Create dense Seattle skyline with many buildings
    // Varying colors for each building
    
    // Dense array of buildings (varying heights like Seattle)
    const buildings = [
      // ORIGINAL 7 buildings (keep original positions)
      { x: 8, z: -35, width: 2, height: 8, depth: 2 },
      { x: 11, z: -38, width: 1.5, height: 6, depth: 1.5 },
      { x: 18, z: -42, width: 2.5, height: 10, depth: 2 },
      { x: 20, z: -36, width: 1.8, height: 7, depth: 1.8 },
      { x: 22, z: -40, width: 2, height: 9, depth: 2 },
      { x: 25, z: -45, width: 1.5, height: 5, depth: 1.5 },
      { x: 5, z: -40, width: 2, height: 7, depth: 2 },
      
      // NEW buildings (shifted left)
      { x: -10, z: -36, width: 2.5, height: 12, depth: 2.5 },
      { x: -7, z: -34, width: 1.8, height: 8, depth: 1.8 },
      { x: -4, z: -38, width: 2.2, height: 11, depth: 2 },
      { x: -1, z: -37, width: 2, height: 10, depth: 2 },
      
      { x: -12, z: -40, width: 2, height: 10, depth: 2 },
      { x: -9, z: -41, width: 2.3, height: 13, depth: 2.3 },
      { x: -6, z: -39, width: 1.6, height: 7, depth: 1.6 },
      { x: -3, z: -42, width: 2.5, height: 15, depth: 2.5 },
      { x: 0, z: -43, width: 1.9, height: 9, depth: 1.9 },
      { x: 3, z: -41, width: 2.4, height: 12, depth: 2.2 },
      
      { x: -11, z: -45, width: 2.2, height: 16, depth: 2.2 },
      { x: -8, z: -47, width: 2.6, height: 18, depth: 2.5 },
      { x: -5, z: -46, width: 2, height: 14, depth: 2 },
      { x: -2, z: -48, width: 2.8, height: 17, depth: 2.8 },
      { x: 1, z: -46, width: 2.3, height: 15, depth: 2.3 },
      { x: 4, z: -47, width: 2.5, height: 16, depth: 2.5 },
      
      // Extra tall (new)
      { x: -7, z: -44, width: 3, height: 20, depth: 3 },
      { x: -2, z: -45, width: 2.7, height: 19, depth: 2.7 }
    ];
    
    buildings.forEach(b => {
      const geometry = new THREE.BoxGeometry(b.width, b.height, b.depth);
      
      // Random building color with more variety
      const colorVariations = [
        0x1a1a1a, // Black
        0x1a1a1a, // Black (appears twice for ~20% chance)
        0x3a3a3a, // Very dark gray
        0x505050, // Dark gray
        0x707070, // Light gray
        0x8a8a8a, // Very light gray
        0x4a3a2a, // Dark brown
        0x6a5a4a, // Tan
        0x5a6a7a, // Blue-gray
        0x7a6a5a  // Warm gray
      ];
      const randomColor = colorVariations[Math.floor(Math.random() * colorVariations.length)];
      
      const buildingMat = new THREE.MeshStandardMaterial({ 
        color: randomColor,
        emissive: randomColor, // Use same color for emissive
        emissiveIntensity: 0.05, // Very subtle glow (won't wash out color)
        roughness: 0.7
      });
      
      const building = new THREE.Mesh(geometry, buildingMat);
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
    
    // Player movement (WASD/Arrows) - camera-relative
    if (this.player) {
      const moveSpeed = 5;
      let forward = 0; // Forward/backward
      let right = 0;   // Left/right
      
      // Arrow keys
      if (this.controls.up.isDown) forward += 1;
      if (this.controls.down.isDown) forward -= 1;
      if (this.controls.right.isDown) right += 1;
      if (this.controls.left.isDown) right -= 1;
      
      // WASD keys (need to add manually)
      const keyboard = this.input.keyboard;
      if (keyboard) {
        if (keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W).isDown) forward += 1;
        if (keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S).isDown) forward -= 1;
        if (keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D).isDown) right += 1;
        if (keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A).isDown) right -= 1;
      }
      
      // Calculate camera's forward and right directions (on XZ plane)
      const cameraForward = new THREE.Vector3();
      const cameraRight = new THREE.Vector3();
      
      // Get camera's look direction
      this.camera.getWorldDirection(cameraForward);
      cameraForward.y = 0; // Project onto ground plane
      cameraForward.normalize();
      
      // Right is perpendicular to forward
      cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));
      cameraRight.normalize();
      
      // Combine forward and right movements
      const moveVector = new THREE.Vector3();
      moveVector.addScaledVector(cameraForward, forward);
      moveVector.addScaledVector(cameraRight, right);
      
      // Normalize if moving diagonally
      if (moveVector.length() > 0) {
        moveVector.normalize();
      }
      
      // Calculate new position
      const newX = this.player.position.x + moveVector.x * moveSpeed * dt;
      const newZ = this.player.position.z + moveVector.z * moveSpeed * dt;
      
      // Check collisions with objects
      let canMove = true;
      
      // Tent collision (at -7, 0, 1)
      const distToTent = Math.sqrt((newX + 7) ** 2 + (newZ - 1) ** 2);
      if (distToTent < 2) canMove = false;
      
      // Chair collision (at -2, 0, 4) - smaller to allow passing near fire
      const distToChair = Math.sqrt((newX + 2.5) ** 2 + (newZ - 4.5) ** 2);
      if (distToChair < 0.8) canMove = false;
      
      // Hammock area collision (between trees at -4, 7 and -7, 4)
      const hammockMidX = (-4 + -7) / 2; // -5.5
      const hammockMidZ = (7 + 4) / 2; // 5.5
      const distToHammock = Math.sqrt((newX - hammockMidX) ** 2 + (newZ - hammockMidZ) ** 2);
      if (distToHammock < 1.2) canMove = false; // Smaller area just between trees
      
      // Apply movement only if no collision
      if (canMove) {
        this.player.position.x = newX;
        this.player.position.z = newZ;
      }
      
      // Rotate player to face movement direction
      if (moveVector.length() > 0) {
        const targetAngle = Math.atan2(moveVector.x, moveVector.z);
        this.player.rotation.y = targetAngle;
        
        // Animate walking
        this.walkAnimTime += dt * 8; // Animation speed
        const swing = Math.sin(this.walkAnimTime) * 0.3; // Swing amount
        
        // Legs swing opposite
        this.leftLeg.rotation.x = swing;
        this.rightLeg.rotation.x = -swing;
        
        // Arms swing opposite to legs
        this.leftArm.rotation.x = -swing * 0.8; // Less swing than legs
        this.rightArm.rotation.x = swing * 0.8;
      } else {
        // Reset to idle pose
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        this.leftArm.rotation.x = 0;
        this.rightArm.rotation.x = 0;
      }
      
      // Jumping (SPACE key)
      if (Phaser.Input.Keyboard.JustDown(this.controls.jump) && !this.isJumping) {
        this.isJumping = true;
        this.jumpVelocity = 8;
      }
      
      // Apply gravity and jumping
      if (this.isJumping) {
        this.jumpVelocity -= 20 * dt;
        this.player.position.y += this.jumpVelocity * dt;
        
        // Jump animation - arms up, legs tucked
        const jumpProgress = (this.player.position.y) / 2; // 0 to 1 as jump progresses
        
        // Arms raise up during jump
        this.leftArm.rotation.x = -Math.PI / 3 * jumpProgress; // Raise left arm
        this.rightArm.rotation.x = -Math.PI / 3 * jumpProgress; // Raise right arm
        this.leftArm.rotation.z = -0.3 * jumpProgress; // Spread arms out
        this.rightArm.rotation.z = 0.3 * jumpProgress;
        
        // Legs tuck up during jump
        this.leftLeg.rotation.x = Math.PI / 4 * jumpProgress; // Tuck legs
        this.rightLeg.rotation.x = Math.PI / 4 * jumpProgress;
        
        if (this.player.position.y <= 0) {
          this.player.position.y = 0; // Land on ground (not 1)
          this.isJumping = false;
          this.jumpVelocity = 0;
          
          // Reset jump pose
          this.leftArm.rotation.z = 0;
          this.rightArm.rotation.z = 0;
        }
      }
      
      // Keep player in bounds
      this.player.position.x = Math.max(-15, Math.min(15, this.player.position.x));
      this.player.position.z = Math.max(-10, Math.min(10, this.player.position.z));
      
      // Check if player walks through fire (fire is at 0, 0, 2)
      const fireX = 0, fireZ = 2;
      const distToFire = Math.sqrt(
        (this.player.position.x - fireX) ** 2 + 
        (this.player.position.z - fireZ) ** 2
      );
      
      if (distToFire < 1.5 && !this.isJumping) {
        // Too close to fire! Auto-jump and say "Ouch!"
        console.log("Fire collision! Distance:", distToFire);
        this.isJumping = true;
        this.jumpVelocity = 8;
        
        // Show "Ouch!" text via DOM (floats up and fades)
        const ouchDiv = document.createElement('div');
        ouchDiv.textContent = "Ouch!";
        ouchDiv.style.position = 'fixed';
        ouchDiv.style.top = '50%';
        ouchDiv.style.left = '50%';
        ouchDiv.style.transform = 'translate(-50%, -50%)';
        ouchDiv.style.fontSize = '35px';
        ouchDiv.style.fontFamily = 'monospace';
        ouchDiv.style.fontWeight = 'bold';
        ouchDiv.style.color = '#ff0000';
        // ouchDiv.style.textShadow = '2px 2px 4px'; // Shadow for visibility
        ouchDiv.style.zIndex = '9999';
        ouchDiv.style.pointerEvents = 'none';
        ouchDiv.style.transition = 'all 1.5s ease-out';
        document.body.appendChild(ouchDiv);
        
        console.log("Ouch text created!");
        
        // Animate: float up and fade out
        setTimeout(() => {
          ouchDiv.style.top = '20%'; // Float up
          ouchDiv.style.opacity = '0'; // Fade out
        }, 50);
        
        // Remove after animation
        setTimeout(() => {
          if (ouchDiv.parentNode) {
            document.body.removeChild(ouchDiv);
          }
        }, 1600);
      }
    }
    
    // Update camera to follow player
    this.updateCameraPosition();
    
    // Animate airplane flying across
    if (this.airplane) {
      this.airplane.position.x += dt * 15; // Fly left to right
      
      // Debug log every 2 seconds
      if (Math.floor(this.time.now / 2000) !== Math.floor((this.time.now - this.game.loop.delta) / 2000)) {
        console.log("Airplane position:", this.airplane.position.x.toFixed(1), this.airplane.position.y, this.airplane.position.z);
      }
      
      // Loop: reset when too far right
      if (this.airplane.position.x > 100) {
        this.airplane.position.x = -100;
      }
    }
    
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
    const camY = this.player.position.y + this.cameraHeightOffset + Math.sin(this.cameraAngleV) * 3;
    
    // Set camera position
    this.camera.position.set(camX, camY, camZ);
    
    // Look at point well above player so character appears in lower third of screen
    const lookAtY = this.player.position.y + 3; // Look 3 units above player (was 1)
    this.camera.lookAt(this.player.position.x, lookAtY, this.player.position.z);
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

