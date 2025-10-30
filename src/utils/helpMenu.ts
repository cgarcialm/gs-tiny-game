import Phaser from "phaser";

export class HelpMenu {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private helpText: Phaser.GameObjects.Text;
  private visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Create container for help menu
    this.container = scene.add.container(160, 90);
    this.container.setDepth(1000);
    
    // Semi-transparent background
    this.background = scene.add.rectangle(0, 0, 280, 150, 0x000000, 0.9);
    this.background.setStrokeStyle(2, 0x00d4ff);
    
    // Title
    this.titleText = scene.add.text(0, -60, "CONTROLS", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#00d4ff",
      fontStyle: "bold",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);
    
    // Help text
    const helpContent = [
      "Movement:",
      "  WASD or Arrow Keys",
      "  SPACE - Jump",
      "",
      "Actions:",
      "  E - Interact",
      "  ENTER/SPACE - Advance dialogue",
      "  ESC - Pause",
      "",
      "Press H to close this menu"
    ].join("\n");
    
    this.helpText = scene.add.text(0, 10, helpContent, {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#cfe8ff",
      align: "left",
      lineSpacing: 2,
      resolution: 2,
    }).setOrigin(0.5);
    
    // Add to container
    this.container.add([this.background, this.titleText, this.helpText]);
    
    // Hide by default
    this.hide();
  }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
    
    // Pulse animation
    this.scene.tweens.add({
      targets: this.container,
      scale: { from: 0.9, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 200,
      ease: "Back.easeOut"
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

