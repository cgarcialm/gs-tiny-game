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
    this.background = scene.add.rectangle(0, 0, 260, 140, 0x000000, 0.9);
    this.background.setStrokeStyle(2, 0x00d4ff);
    
    // Title
    this.titleText = scene.add.text(0, -55, "CONTROLS", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#00d4ff",
      fontStyle: "bold",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);
    
    // Left column - categories
    const categories = [
      "MOVEMENT",
      "",
      "",
      "ACTIONS",
      "",
      "",
      "",
      ""
    ].join("\n");
    
    const categoryText = scene.add.text(-115, -30, categories, {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#00d4ff",
      align: "left",
      lineSpacing: 2,
      resolution: 2,
    }).setOrigin(0, 0);
    
    // Right column - keys
    const keys = [
      "WASD / Arrows",
      "SPACE - Jump",
      "",
      "E - Interact",
      "ENTER - Dialogue",
      "ESC - Pause",
      "M - Mute",
      "",
    ].join("\n");
    
    this.helpText = scene.add.text(-40, -30, keys, {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#cfe8ff",
      align: "left",
      lineSpacing: 2,
      resolution: 2,
    }).setOrigin(0, 0);
    
    // Footer - bottom right corner
    const footerText = scene.add.text(120, 64, "H to close", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#999999",
      align: "right",
      resolution: 2,
    }).setOrigin(1, 1);
    
    // Add to container
    this.container.add([this.background, this.titleText, categoryText, this.helpText, footerText]);
    
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

