import Phaser from "phaser";

export class PauseMenu {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private messageText: Phaser.GameObjects.Text;
  private instructionsText: Phaser.GameObjects.Text;
  private visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Create container for pause menu
    this.container = scene.add.container(160, 90);
    this.container.setDepth(2000); // Above everything including help menu
    
    // Dark overlay background
    const overlay = scene.add.rectangle(0, 0, 320, 180, 0x000000, 0.8);
    overlay.setOrigin(0.5);
    
    // Menu box background
    this.background = scene.add.rectangle(0, 0, 260, 120, 0x1a1a2e, 1);
    this.background.setStrokeStyle(2, 0xff0066);
    
    // Title
    this.titleText = scene.add.text(0, -40, "GAME PAUSED", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ff0066",
      fontStyle: "bold",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);
    
    // Message
    this.messageText = scene.add.text(0, -5, "Do you want to exit?", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#cfe8ff",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);
    
    // Instructions
    this.instructionsText = scene.add.text(0, 35, "ESC - Resume\nENTER - Exit to Title", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ffeb3b",
      align: "center",
      lineSpacing: 4,
      resolution: 2,
    }).setOrigin(0.5);
    
    // Add to container
    this.container.add([overlay, this.background, this.titleText, this.messageText, this.instructionsText]);
    
    // Hide by default
    this.hide();
  }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
    
    // Pulse animation
    this.scene.tweens.add({
      targets: this.background,
      scaleX: { from: 0.95, to: 1 },
      scaleY: { from: 0.95, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 150,
      ease: "Back.easeOut"
    });
    
    this.scene.tweens.add({
      targets: [this.titleText, this.messageText, this.instructionsText],
      alpha: { from: 0, to: 1 },
      duration: 150,
      ease: "Power2"
    });
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.container.destroy();
  }
}

