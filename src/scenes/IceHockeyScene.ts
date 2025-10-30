import Phaser from "phaser";

/**
 * Ice Hockey Game Scene - Everett Silvertips
 * Level 2: Find Ceci at the hockey game
 */
export default class IceHockeyScene extends Phaser.Scene {
  constructor() {
    super("IceHockey");
  }

  create() {
    // Set camera to respect pixel art settings
    this.cameras.main.setRoundPixels(true);
    
    // Placeholder background
    const bg = this.add.rectangle(160, 90, 320, 180, 0x1a3a52, 1);
    bg.setOrigin(0.5);
    
    // Temp text
    this.add.text(160, 90, "ICE HOCKEY SCENE\nComing Soon!", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
      align: "center",
      resolution: 1,
    }).setOrigin(0.5);
    
    // Debug: Press ENTER to continue
    const enterKey = this.input.keyboard!.addKey("ENTER");
    enterKey.on('down', () => {
      this.scene.start("Game");
    });
  }
}

