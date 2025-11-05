import Phaser from "phaser";
import * as THREE from "three";
import { initializeGameScene } from "../utils/sceneSetup";
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
  private renderer!: THREE.WebGLRenderer;
  private spaceNeedle!: THREE.Group;

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
    
    // Overlay text
    this.add.text(160, 20, "All Memories Recovered", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(100);
    
    this.add.text(160, 160, "Press ENTER to continue", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#aaaaaa"
    }).setOrigin(0.5).setDepth(100);
  }

  private setupThreeJS() {
    // Create Three.js scene
    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV
      320 / 180, // Aspect ratio
      0.1, // Near
      1000 // Far
    );
    this.camera.position.set(0, 2, 5); // Camping viewpoint
    this.camera.lookAt(0, 5, -20); // Look toward Space Needle
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: false, // Pixel art style
      alpha: true 
    });
    this.renderer.setSize(320, 180);
    
    // Position renderer to overlay Phaser canvas exactly
    const gameCanvas = this.game.canvas;
    const rect = gameCanvas.getBoundingClientRect();
    
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = rect.top + 'px';
    this.renderer.domElement.style.left = rect.left + 'px';
    this.renderer.domElement.style.width = rect.width + 'px';
    this.renderer.domElement.style.height = rect.height + 'px';
    this.renderer.domElement.style.pointerEvents = 'none';
    this.renderer.domElement.style.zIndex = '1';
    
    // Add renderer to body (not Phaser's container)
    document.body.appendChild(this.renderer.domElement);
    
    // Add lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.threeScene.add(ambient);
    
    const sun = new THREE.DirectionalLight(0xffd700, 0.8);
    sun.position.set(5, 10, 5);
    this.threeScene.add(sun);
  }
  
  private createCampingSite() {
    // Ground (green grass)
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a7c59,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    this.threeScene.add(ground);
    
    // Simple tent (triangular prism)
    const tentGroup = new THREE.Group();
    
    // Tent body
    const tentGeometry = new THREE.ConeGeometry(1.5, 2, 4);
    const tentMaterial = new THREE.MeshStandardMaterial({ color: 0xff6347 }); // Orange
    const tent = new THREE.Mesh(tentGeometry, tentMaterial);
    tent.rotation.y = Math.PI / 4;
    tent.position.y = 1;
    tentGroup.add(tent);
    
    tentGroup.position.set(-3, 0, 2);
    this.threeScene.add(tentGroup);
    
    // Campfire (simple)
    const fireGroup = new THREE.Group();
    
    // Fire logs
    const logGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1);
    const logMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(logGeometry, logMaterial);
      log.rotation.z = (i / 4) * Math.PI;
      log.position.y = 0.05;
      fireGroup.add(log);
    }
    
    // Fire (glowing sphere)
    const fireGeometry = new THREE.SphereGeometry(0.3);
    const fireMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff6600,
      emissive: 0xff6600
    });
    const fire = new THREE.Mesh(fireGeometry, fireMaterial);
    fire.position.y = 0.5;
    fireGroup.add(fire);
    
    fireGroup.position.set(1, 0, 1);
    this.threeScene.add(fireGroup);
  }
  
  private createSpaceNeedle() {
    this.spaceNeedle = new THREE.Group();
    
    // Base (tripod legs - simplified)
    const baseGeometry = new THREE.CylinderGeometry(0.1, 0.3, 3);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 1.5;
    this.spaceNeedle.add(base);
    
    // Observation deck (disk)
    const deckGeometry = new THREE.CylinderGeometry(1, 1, 0.5);
    const deckMaterial = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.y = 4;
    this.spaceNeedle.add(deck);
    
    // Spire (thin cylinder)
    const spireGeometry = new THREE.CylinderGeometry(0.05, 0.1, 3);
    const spireMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const spire = new THREE.Mesh(spireGeometry, spireMaterial);
    spire.position.y = 6.5;
    this.spaceNeedle.add(spire);
    
    // Position far in the distance
    this.spaceNeedle.position.set(5, 0, -25);
    this.spaceNeedle.scale.set(2, 2, 2);
    
    this.threeScene.add(this.spaceNeedle);
  }

  update() {
    // Handle menus
    if (this.pauseMenu.isVisible() || this.helpMenu.isVisible()) {
      return;
    }
    
    // Render Three.js scene
    if (this.renderer && this.threeScene && this.camera) {
      this.renderer.render(this.threeScene, this.camera);
    }
    
    // Gentle camera sway for atmosphere
    if (this.camera) {
      this.camera.position.x = Math.sin(this.time.now / 2000) * 0.5;
    }
    
    // Press ENTER to finish (TODO: Ending sequence)
    if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
      console.log("TODO: Game ending/credits");
      // For now, could loop back to title or show credits
    }
  }
  
  shutdown() {
    // Clean up Three.js resources
    if (this.renderer) {
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }
  }
}

