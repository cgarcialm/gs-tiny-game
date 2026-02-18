import Phaser from "phaser";

/**
 * DialogueManager - Reusable dialogue box system for all scenes
 * Provides a consistent dialogue UI with show/hide functionality
 */
export class DialogueManager {
  private container: Phaser.GameObjects.Container;
  private dialogBox: Phaser.GameObjects.Rectangle;
  private dialogText: Phaser.GameObjects.Text;
  private visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    
    // Create container for dialogue UI
    this.container = scene.add.container(0, 0);
    this.container.setDepth(110); // Above game elements and sidebar
    
    // Dialogue box background
    this.dialogBox = scene.add.rectangle(160, 160, 300, 40, 0x000000, 0.6);
    this.dialogBox.setStrokeStyle(1, 0x99bbff, 0.9);
    this.dialogBox.setOrigin(0.5);
    
    // Dialogue text
    this.dialogText = scene.add.text(20, 146, "", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#dff1ff",
      wordWrap: { width: 280 },
      resolution: 2,
    });
    this.dialogText.setOrigin(0, 0);
    
    this.container.add([this.dialogBox, this.dialogText]);
    this.container.setScrollFactor(0); // Keep dialogue on screen when camera scrolls (e.g. Ice Hockey)
    this.hide();
  }

  /**
   * Show dialogue with a message
   */
  show(message: string): void {
    this.visible = true;
    this.dialogText.setText(message);
    this.container.setVisible(true);
  }

  /**
   * Hide dialogue
   */
  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  /**
   * Get the dialogue container (e.g. for camera.ignore in multi-camera setups)
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Check if dialogue is currently visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Set container position (e.g. to pin dialogue to a screen position when camera rotates)
   */
  setContainerPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /**
   * Set container angle in degrees (e.g. counter-rotate so dialogue stays upright)
   */
  setContainerAngle(angle: number): void {
    this.container.setAngle(angle);
  }

  /**
   * Update dialogue text without changing visibility
   */
  setText(message: string): void {
    this.dialogText.setText(message);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.container.destroy();
  }
}

