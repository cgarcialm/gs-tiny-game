import Phaser from "phaser";
import * as THREE from "three";
import { create3DGrayson } from "../utils/create3DGrayson";

/**
 * Void3DScene - Simple spotlight test
 */
export default class Void3DScene extends Phaser.Scene {
  private threeScene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private threeRenderer!: THREE.WebGLRenderer;
  private grayson!: THREE.Group;
  private spotlight!: THREE.SpotLight;
  private sceneReady = false;

  constructor() {
    super("Void3D");
  }

  create() {
    // Don't fade in - show GameScene underneath during particle effect
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)'); // Transparent
    
    this.setupThreeJS();
    this.createGround();
    this.createWall(); // Add physical wall
    this.createGridLines(); // Add floor grid lines
    this.createWallGrid(); // Add wall grid lines
    this.createGrayson();
    this.setupLighting();
    
    // Create 2D Grayson sprite for transformation
    this.create2DGrayson();
    
    // Start transformation immediately
    this.startTransformation();
    
    // Mark ready
    this.time.delayedCall(100, () => {
      this.sceneReady = true;
    });
  }

  private create2DGrayson() {
    // Don't create 2D sprite - just particles
  }

  private createRevealSpiral() {
    console.log("Creating reveal spiral!");
    
    // Grayson's colors
    const colors = [
      0x90EE90, // Light green (shirt)
      0x8B4513, // Brown (pants)
      0x4169E1, // Blue (hair)
      0xFFDAB9  // Peach (skin)
    ];
    
    const revealParticles: any[] = [];
    const graysonHeight = 20;
    const helixHeight = graysonHeight + 20;
    const startRadius = 30; // Start even wider
    
    // Create spiral particles starting wide
    for (let i = 0; i < 200; i++) {
      const heightOffset = (i / 200) * helixHeight - helixHeight / 2;
      const angle = (i / 200) * Math.PI * 10;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const pixel = this.add.rectangle(
        160 + Math.cos(angle) * startRadius,
        120 + heightOffset, // Lower on screen (screen height is 180, center was 90)
        6, 6, // Bigger pixels
        color
      );
      pixel.setDepth(200); // Above 3D scene
      pixel.setAlpha(1); // Fully visible
      pixel.setVisible(true);
      
      revealParticles.push({
        obj: pixel,
        angle: angle,
        heightOffset: heightOffset,
        currentRadius: startRadius,
        speed: 0.12 + Math.random() * 0.06,
        shrinkSpeed: 0.1 + Math.random() * 0.3 // Shrink inward
      });
    }
    
    console.log(`Created ${revealParticles.length} reveal particles`);
    
    // Animate particles spiraling inward
    this.time.addEvent({
      delay: 12,
      repeat: 180, // ~4 seconds (much longer!)
      callback: () => {
        revealParticles.forEach(p => {
          // Rotate and shrink inward
          p.angle += p.speed;
          p.currentRadius -= p.shrinkSpeed;
          
          p.obj.x = 160 + Math.cos(p.angle) * p.currentRadius;
          p.obj.y = 100 + p.heightOffset; // Match the initial y position
          
          // Fade as reaching center
          if (p.currentRadius < 15) {
            p.obj.alpha = p.currentRadius / 15;
          }
          
          // Destroy when gone
          if (p.currentRadius <= 0) {
            p.obj.destroy();
          }
        });
      }
    });
    
    // After spiral completes, clean up and fully show 3D scene
    this.time.delayedCall(2000, () => { // Match animation duration
      revealParticles.forEach(p => {
        if (p.obj && p.obj.active) {
          p.obj.destroy();
        }
      });
      
      // Fully show 3D scene
      if (this.threeRenderer && this.threeRenderer.domElement) {
        this.threeRenderer.domElement.style.opacity = '1';
      }
      
      // Auto-continue to camera transition after 2 seconds
      this.time.delayedCall(2000, () => {
        this.animateCameraTransition();
      });
    });
  }

  private startTransformation() {
    // Grayson's colors
    const colors = [
      0x90EE90, // Light green (shirt)
      0x8B4513, // Brown (pants)
      0x4169E1, // Blue (hair)
      0xFFDAB9  // Peach (skin)
    ];
    
    const particles: any[] = [];
    const graysonHeight = 20; // Grayson's approximate height
    const helixHeight = graysonHeight + 2; // A bit taller
    const startRadius = 1; // Start very thin
    
    // Create MORE vertical helix pixels
    for (let i = 0; i < 300; i++) {
      const heightOffset = (i / 200) * helixHeight - helixHeight / 2;
      const angle = (i / 200) * Math.PI * 10; // More rotations
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const pixel = this.add.rectangle(
        160,
        90 + heightOffset,
        4, 4, // 4x4 pixels
        color
      );
      pixel.setDepth(100);
      
      particles.push({
        obj: pixel,
        angle: angle,
        heightOffset: heightOffset,
        currentRadius: startRadius,
        speed: 0.08 + Math.random() * 0.04, // Slower rotation
        expandSpeed: 0.1 + Math.random() * 0.1 // Less expansion
      });
    }
    
    // Animate particles expanding outward (no fading)
    this.time.addEvent({
      delay: 12,
      repeat: 180, // Match reveal spiral timing
      callback: () => {
        particles.forEach(p => {
          // Rotate and expand
          p.angle += p.speed;
          p.currentRadius += p.expandSpeed;
          
          p.obj.x = 160 + Math.cos(p.angle) * p.currentRadius;
          p.obj.y = 90 + p.heightOffset;
          
          // Don't fade particles - keep them visible
        });
      }
    });
    
    // Start fade DURING spiral animation
    this.time.delayedCall(1200, () => { // Start later to see more spiral
      // Fade out Phaser camera (fades particles + GameScene)
      this.cameras.main.fadeOut(1400, 0, 0, 0); // Slower fade
      
      // After fade out completes, clean up and show 3D
      this.time.delayedCall(800, () => {
        // Clean up particles
        particles.forEach(p => {
          if (p.obj && p.obj.active) {
            p.obj.destroy();
          }
        });
        
        // Stop GameScene
        this.scene.stop("Game");
        
        // Stay black for 0.5 seconds
        this.time.delayedCall(500, () => {
          // Reset camera - make it transparent again and clear fade effect
          this.cameras.main.resetFX();
          this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)'); // Transparent
          
          // Keep 3D scene invisible initially (particles need to be on top)
          if (this.threeRenderer && this.threeRenderer.domElement) {
            this.threeRenderer.domElement.style.opacity = '0';
          }
          
          // Small delay to ensure everything is ready
          this.time.delayedCall(100, () => {
            // Start showing 3D scene gradually
            if (this.threeRenderer && this.threeRenderer.domElement) {
              this.threeRenderer.domElement.style.opacity = '0.3'; // Dim background
            }
            
            // Create shrinking spiral to reveal Grayson
            this.createRevealSpiral();
          });
        });
      });
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
    
    // Keep Three.js renderer invisible during particle transformation
    this.threeRenderer.domElement.style.opacity = '0';
  }

  private createGround() {
    // Wide ground plane covering horizontal area
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 50, 3),
      new THREE.MeshPhongMaterial({ 
        color: 0x003d4d, // Teal/cyan void color
        shininess: 10
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.threeScene.add(ground);
  }

  private createWall() {
    // Physical wall backdrop to receive light
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 40),
      new THREE.MeshPhongMaterial({
        color: 0x003d4d, // Same teal as floor
        shininess: 10
      })
    );
    wall.position.z = -25; // At back
    wall.position.y = 20; // Lift up so it sits on ground (height 40, so center at y=20)
    wall.receiveShadow = true; // Receives spotlight!
    this.threeScene.add(wall);
  }

  private createGridLines() {
    // Add magenta grid lines on floor (square cells!)
    const gridWidth = 120;
    const gridDepth = 50;
    const cellSize = 2; // Square cells of 2 units
    const divisionsX = gridWidth / cellSize; // 60 vertical lines
    const divisionsZ = gridDepth / cellSize; // 25 horizontal lines (square cells!)
    
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
    // Add magenta grid on vertical wall backdrop (20 squares wide)
    const gridWidth = 120;
    const wallHeight = 40;
    const divisionsX = 28; // 20 divisions = 20 squares horizontally
    const divisionsY = 10; // 10 divisions vertically
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
    const ambient = new THREE.AmbientLight(0x222222, 0.3);
    this.threeScene.add(ambient);
    
    // Powerful spotlight - starts WIDE to illuminate whole floor and wall
    this.spotlight = new THREE.SpotLight(0xffffff, 95);
    this.spotlight.position.set(0, 20, 10); // Higher position to cover wall
    this.spotlight.target.position.set(0, 2, 0); // Point at Grayson (head height)
    this.spotlight.angle = Math.PI / 2; // WIDE angle (90°) - covers everything!
    this.spotlight.penumbra = 0.8;
    this.spotlight.distance = 0;
    this.spotlight.decay = 1.2;
    this.spotlight.castShadow = true;
    
    // Sharp shadows
    this.spotlight.shadow.mapSize.width = 2048;
    this.spotlight.shadow.mapSize.height = 2048;
    
    this.threeScene.add(this.spotlight);
    this.threeScene.add(this.spotlight.target);
    this.spotlight.target.updateMatrixWorld();
  }

  private fadeOutToScene(duration: number) {
    // Fade Phaser camera
    this.cameras.main.fadeOut(duration, 0, 0, 0);
    
    // Fade Three.js renderer by animating its opacity
    const fadeAnim = { opacity: 1 };
    this.tweens.add({
      targets: fadeAnim,
      opacity: 0,
      duration: duration,
      ease: 'Power2.easeInOut',
      onUpdate: () => {
        if (this.threeRenderer && this.threeRenderer.domElement) {
          this.threeRenderer.domElement.style.opacity = fadeAnim.opacity.toString();
        }
      },
      onComplete: () => {
        this.scene.start("Camping");
      }
    });
  }

  private animateCameraTransition() {
    const targetX = 0;
    const targetY = 5;
    const targetZ = 5;
    const transitionDuration = 3500; // Longer transition (3.5 seconds)
    
    // Animate spotlight narrowing (from wide to focused)
    const spotlightAnim = { angle: this.spotlight.angle }; // Start: π/2
    this.tweens.add({
      targets: spotlightAnim,
      angle: Math.PI / 12, // End: narrow focused beam
      duration: transitionDuration,
      ease: 'Power2.easeInOut',
      onUpdate: () => {
        this.spotlight.angle = spotlightAnim.angle;
      }
    });
    
    // Animate camera movement (simultaneously)
    this.tweens.add({
      targets: this.camera.position,
      x: targetX,
      y: targetY,
      z: targetZ,
      duration: transitionDuration,
      ease: 'Power2.easeInOut',
      onUpdate: () => {
        this.camera.lookAt(0, 1.5, 0);
      },
      onComplete: () => {
        // Custom fade that includes Three.js renderer
        this.fadeOutToScene(2500);
      }
    });
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
