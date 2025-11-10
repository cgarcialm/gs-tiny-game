import Phaser from "phaser";
import * as THREE from "three";
import { fadeToScene } from "../utils/sceneTransitions";
import { create3DGrayson } from "../utils/create3DGrayson";

/**
 * Void3DScene - Simple spotlight test
 */
export default class Void3DScene extends Phaser.Scene {
  private threeScene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private threeRenderer!: THREE.WebGLRenderer;
  private grayson!: THREE.Group;
  private sceneReady = false;

  constructor() {
    super("Void3D");
  }

  create() {
    this.setupThreeJS();
    this.createGround();
    this.createGridLines(); // Add floor grid lines
    this.createWallGrid(); // Add wall grid lines
    this.createGrayson();
    this.setupLighting();
    
    // Mark ready
    this.time.delayedCall(100, () => {
      this.sceneReady = true;
    });
    
    // Instruction
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
    
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (instructionDiv.parentNode) {
        document.body.removeChild(instructionDiv);
      }
      fadeToScene(this, "Camping", 1000);
    });
  }

  private setupThreeJS() {
    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color(0x003d4d); // Void background
    
    this.camera = new THREE.PerspectiveCamera(75, 320 / 180, 0.1, 1000);
    this.camera.position.set(0, 1.8, 6); // Lower camera (at eye level)
    this.camera.lookAt(0, 1.8, 0); // Look straight ahead (not down)
    
    this.threeRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.threeRenderer.setSize(320, 180);
    this.threeRenderer.shadowMap.enabled = true;
    
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
  }

  private createGround() {
    // Wide ground plane covering horizontal area
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 50), // Much wider!
      new THREE.MeshPhongMaterial({ 
        color: 0x003d4d, // Teal/cyan void color
        shininess: 10
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.threeScene.add(ground);
  }

  private createGridLines() {
    // Add magenta grid lines on floor (like GameScene void)
    const gridWidth = 120;
    const gridDepth = 50;
    const divisionsX = 60; // Vertical lines
    const divisionsZ = 25; // Horizontal lines
    
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff00ff, // Bright magenta (GameScene void color)
      opacity: 0.6,
      transparent: true
    });
    
    const gridGroup = new THREE.Group();
    
    // Vertical lines (along Z axis)
    for (let i = 0; i <= divisionsX; i++) {
      const x = (i / divisionsX) * gridWidth - gridWidth / 2;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, -gridDepth / 2),
        new THREE.Vector3(x, 0, gridDepth / 2)
      ]);
      const line = new THREE.Line(geometry, lineMaterial);
      gridGroup.add(line);
    }
    
    // Horizontal lines (along X axis)
    for (let i = 0; i <= divisionsZ; i++) {
      const z = (i / divisionsZ) * gridDepth - gridDepth / 2;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-gridWidth / 2, 0, z),
        new THREE.Vector3(gridWidth / 2, 0, z)
      ]);
      const line = new THREE.Line(geometry, lineMaterial);
      gridGroup.add(line);
    }
    
    gridGroup.position.y = 0.01; // Slightly above ground to prevent z-fighting
    this.threeScene.add(gridGroup);
  }

  private createWallGrid() {
    // Add magenta grid on vertical wall backdrop
    const gridWidth = 120;
    const wallHeight = 40;
    const divisionsX = 60; // Vertical lines
    const divisionsY = 20; // Horizontal lines
    const wallZ = -25; // Back edge position
    
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff00ff, // Bright magenta
      opacity: 0.6,
      transparent: true
    });
    
    const wallGroup = new THREE.Group();
    
    // Vertical lines (going up the wall)
    for (let i = 0; i <= divisionsX; i++) {
      const x = (i / divisionsX) * gridWidth - gridWidth / 2;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, wallZ),
        new THREE.Vector3(x, wallHeight, wallZ)
      ]);
      const line = new THREE.Line(geometry, lineMaterial);
      wallGroup.add(line);
    }
    
    // Horizontal lines (across the wall)
    for (let i = 0; i <= divisionsY; i++) {
      const y = (i / divisionsY) * wallHeight;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-gridWidth / 2, y, wallZ),
        new THREE.Vector3(gridWidth / 2, y, wallZ)
      ]);
      const line = new THREE.Line(geometry, lineMaterial);
      wallGroup.add(line);
    }
    
    this.threeScene.add(wallGroup);
  }

  private createGrayson() {
    const result = create3DGrayson();
    this.grayson = result.group;
    this.grayson.position.set(0, 0, 0);
    
    // Enable shadows and use Phong material (better for lights)
    this.grayson.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        if (mesh.material) {
          // Convert to MeshPhongMaterial for better lighting
          const oldMat = mesh.material as THREE.MeshStandardMaterial;
          mesh.material = new THREE.MeshPhongMaterial({
            color: oldMat.color,
            emissive: new THREE.Color(0x000000),
            shininess: 30
          });
        }
      }
    });
    
    this.threeScene.add(this.grayson);
  }

  private setupLighting() {
    // Dark ambient for dramatic contrast
    const ambient = new THREE.AmbientLight(0x222222, 0.3); // Darker
    this.threeScene.add(ambient);
    
    // Powerful spotlight from front-above
    const spotlight = new THREE.SpotLight(0xffffff, 95); // Much brighter!
    spotlight.position.set(0, 15, 10); // More from the front (higher z)
    spotlight.target.position.set(0, 1, 0); // Point at Grayson center
    spotlight.angle = Math.PI / 12; // Focused beam
    spotlight.penumbra = 0.8; // Soft edge for visible circle
    spotlight.distance = 0;
    spotlight.decay = 1.2; // More falloff
    spotlight.castShadow = true;
    
    // Sharp shadows
    spotlight.shadow.mapSize.width = 2048;
    spotlight.shadow.mapSize.height = 2048;
    
    this.threeScene.add(spotlight);
    this.threeScene.add(spotlight.target);
    spotlight.target.updateMatrixWorld();
  }

  update() {
    if (!this.sceneReady) return;
    
    if (this.grayson) {
      this.grayson.rotation.y += 0.01;
    }
    
    if (this.threeRenderer && this.threeScene && this.camera) {
      this.threeRenderer.render(this.threeScene, this.camera);
    }
  }

  shutdown() {
    if (this.threeRenderer) {
      if (this.threeRenderer.domElement.parentNode) {
        this.threeRenderer.domElement.parentElement!.removeChild(this.threeRenderer.domElement);
      }
      this.threeRenderer.dispose();
    }
  }
}
