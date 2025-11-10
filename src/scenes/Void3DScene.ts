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
    this.camera.position.set(0, 3, 6); // Closer (was 8)
    this.camera.lookAt(0, 1.5, 0);
    
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
    
    // Powerful spotlight from above
    const spotlight = new THREE.SpotLight(0xffffff, 95); // Much brighter!
    spotlight.position.set(0, 25, 3); // High above, slightly front
    spotlight.target.position.set(0, 0, 0); // Point at Grayson/floor
    spotlight.angle = Math.PI / 24; // Focused beam
    spotlight.penumbra = 0.2; // Soft edge for visible circle
    spotlight.distance = 0;
    spotlight.decay = 1; // More falloff
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
