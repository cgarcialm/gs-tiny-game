import Phaser from "phaser";
import * as THREE from "three";
import { fadeToScene } from "../utils/sceneTransitions";
import { create3DGrayson } from "../utils/create3DGrayson";

/**
 * Void3DScene - Intermediate scene between 2D GameScene and 3D CampingScene
 * Shows 3D Grayson in a perspective void grid
 */
export default class Void3DScene extends Phaser.Scene {
  // Three.js elements
  private threeScene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private threeRenderer!: THREE.WebGLRenderer;
  private grayson3D!: THREE.Group;

  constructor() {
    super("Void3D");
  }

  create() {
    // Set up Three.js scene
    this.setupThreeJS();
    
    // Create 3D Grayson (will import from CampingScene createPlayer method)
    this.createGrayson3D();
    
    // Show "Press ENTER to continue" instruction
    const instructionDiv = document.createElement('div');
    instructionDiv.innerHTML = "Press ENTER to continue";
    instructionDiv.style.position = 'fixed';
    instructionDiv.style.bottom = '10%';
    instructionDiv.style.left = '50%';
    instructionDiv.style.transform = 'translateX(-50%)';
    instructionDiv.style.fontSize = '18px';
    instructionDiv.style.fontFamily = 'monospace';
    instructionDiv.style.color = '#ffffff';
    instructionDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    instructionDiv.style.padding = '10px 20px';
    instructionDiv.style.borderRadius = '5px';
    instructionDiv.style.zIndex = '9999';
    document.body.appendChild(instructionDiv);
    
    // Listen for ENTER key
    this.input.keyboard?.on('keydown-ENTER', () => {
      document.body.removeChild(instructionDiv);
      fadeToScene(this, "Camping", 1000);
    });
  }

  private setupThreeJS() {
    // Create Three.js scene
    this.threeScene = new THREE.Scene();
    
    // Void grid background (perspective grid like GameScene but 3D)
    this.createVoidGrid();
    
    // Create camera (straight-on view)
    this.camera = new THREE.PerspectiveCamera(
      60, // Narrower FOV for less distortion
      320 / 180,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.8, 8); // Closer to Grayson's eye level, further back
    this.camera.lookAt(0, 1.8, 0); // Look straight at Grayson's face
    
    // Create renderer
    this.threeRenderer = new THREE.WebGLRenderer({ 
      antialias: false,
      alpha: true 
    });
    this.threeRenderer.setSize(320, 180);
    
    // Position renderer over Phaser canvas
    const gameCanvas = this.game.canvas;
    const rect = gameCanvas.getBoundingClientRect();
    
    this.threeRenderer.domElement.style.position = 'absolute';
    this.threeRenderer.domElement.style.top = rect.top + 'px';
    this.threeRenderer.domElement.style.left = rect.left + 'px';
    this.threeRenderer.domElement.style.width = rect.width + 'px';
    this.threeRenderer.domElement.style.height = rect.height + 'px';
    this.threeRenderer.domElement.style.pointerEvents = 'none';
    this.threeRenderer.domElement.style.zIndex = '1';
    
    document.body.appendChild(this.threeRenderer.domElement);
    
    // Lighting
    const ambient = new THREE.AmbientLight(0x404040, 1);
    this.threeScene.add(ambient);
    
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 5);
    this.threeScene.add(light);
  }

  private createVoidGrid() {
    // Create custom rectangular grid (wide but not deep)
    const gridWidth = 100; // Wide (horizontal)
    const gridDepth = 40; // Less deep (vertical)
    const divisionsX = 50; // Many vertical lines
    const divisionsZ = 20; // Fewer horizontal lines
    
    const gridGroup = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff00ff, // Bright magenta
      opacity: 0.5,
      transparent: true
    });
    
    // Create vertical lines (along Z axis)
    for (let i = 0; i <= divisionsX; i++) {
      const x = (i / divisionsX) * gridWidth - gridWidth / 2;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, -gridDepth / 2),
        new THREE.Vector3(x, 0, gridDepth / 2)
      ]);
      const line = new THREE.Line(geometry, lineMaterial);
      gridGroup.add(line);
    }
    
    // Create horizontal lines (along X axis)
    for (let i = 0; i <= divisionsZ; i++) {
      const z = (i / divisionsZ) * gridDepth - gridDepth / 2;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-gridWidth / 2, 0, z),
        new THREE.Vector3(gridWidth / 2, 0, z)
      ]);
      const line = new THREE.Line(geometry, lineMaterial);
      gridGroup.add(line);
    }
    
    gridGroup.rotation.x = 0; // Keep floor flat (no tilt for better wall alignment)
    this.threeScene.add(gridGroup);
    
    // Create vertical wall backdrop with straight lines only
    const wallGroup = new THREE.Group();
    const wallHeight = 50;
    const wallDivisionsX = 50; // Vertical lines
    const wallDivisionsY = 25; // Horizontal lines
    
    // Vertical lines (going up the wall)
    for (let i = 0; i <= wallDivisionsX; i++) {
      const x = (i / wallDivisionsX) * gridWidth - gridWidth / 2;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, -gridDepth / 2),
        new THREE.Vector3(x, wallHeight, -gridDepth / 2)
      ]);
      const line = new THREE.Line(geometry, lineMaterial);
      wallGroup.add(line);
    }
    
    // Horizontal lines (across the wall)
    for (let i = 0; i <= wallDivisionsY; i++) {
      const y = (i / wallDivisionsY) * wallHeight;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-gridWidth / 2, y, -gridDepth / 2),
        new THREE.Vector3(gridWidth / 2, y, -gridDepth / 2)
      ]);
      const line = new THREE.Line(geometry, lineMaterial);
      wallGroup.add(line);
    }
    
    // wallGroup.rotation.x = 0; // ← CHANGE THIS to tilt wall (0 = vertical, -π/12 = lean back)
    this.threeScene.add(wallGroup);
    
    // Dark cyan background (matches GameScene void)
    this.threeScene.background = new THREE.Color(0x003d4d);
  }

  private createGrayson3D() {
    // Use shared 3D Grayson creation function
    const result = create3DGrayson();
    this.grayson3D = result.group;
    this.grayson3D.position.set(0, 0, 0); // Center of scene
    
    this.threeScene.add(this.grayson3D);
  }

  update() {
    // Gentle rotation of Grayson
    if (this.grayson3D) {
      this.grayson3D.rotation.y += 0.01;
    }
    
    // Render Three.js scene
    if (this.threeRenderer && this.threeScene && this.camera) {
      this.threeRenderer.render(this.threeScene, this.camera);
    }
  }

  shutdown() {
    // Clean up Three.js resources
    if (this.threeRenderer) {
      if (this.threeRenderer.domElement.parentNode) {
        this.threeRenderer.domElement.parentElement!.removeChild(this.threeRenderer.domElement);
      }
      this.threeRenderer.dispose();
    }
  }
}

