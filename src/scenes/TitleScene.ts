import Phaser from "phaser";

const BOY_ASCII = String.raw`
   _---
   (o_o)
    /|\
    / \
`;

const GIRL_ASCII = String.raw`
    ___
   |(o_o)|
   | /|\ |
   / \
`;

export default class TitleScene extends Phaser.Scene {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private boy!: Phaser.GameObjects.Text;
  private girl!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private speed = 100;

  constructor() { 
    super({ key: "Title" });
  }

  create() {
    // Set camera to respect pixel art settings
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor("#0b0f14");

    // Title
    this.add.text(160, 18, "gs-tiny-game", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#cfe8ff",
      resolution: 1,
    }).setOrigin(0.5);

    // Girl on the left
    this.girl = this.add.text(60, 92, GIRL_ASCII, {
      fontFamily: "monospace",
      fontSize: "7px",
      lineSpacing: 1,
      color: "#ff66ff",
      align: "center",
      resolution: 1,
    }).setOrigin(0.5);

    // Movable boy
    this.boy = this.add.text(160, 92, BOY_ASCII, {
      fontFamily: "monospace",
      fontSize: "7px",
      lineSpacing: 1,
      color: "#a7c7ff",
      align: "center",
      resolution: 1,
    }).setOrigin(0.5);

    this.add.text(160, 150, "v0.0 — prototype", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#7aa0ff",
      resolution: 2,
    }).setOrigin(0.5);

    this.add.text(160, 164, "A/D to move", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#cfe8ff",
      resolution: 1,
    }).setOrigin(0.5);

    // Prompt text (hidden by default)
    this.promptText = this.add.text(40, 60, "Talk to me!", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#cfe8ff",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: { left: 4, right: 4, top: 2, bottom: 2 },
      resolution: 2,
    }).setOrigin(0.5).setVisible(false);

    // Input
    this.keys = {
      A: this.input.keyboard!.addKey("A"),
      D: this.input.keyboard!.addKey("D"),
      LEFT: this.input.keyboard!.addKey("LEFT"),
      RIGHT: this.input.keyboard!.addKey("RIGHT"),
    };
  }

  update() {
    const dt = this.game.loop.delta / 1000;
    let vx = 0;

    // Only left/right movement
    if (this.keys.LEFT.isDown || this.keys.A.isDown) vx -= 1;
    if (this.keys.RIGHT.isDown || this.keys.D.isDown) vx += 1;

    if (vx) {
      this.boy.x += vx * this.speed * dt;
      // Keep on screen
      this.boy.x = Phaser.Math.Clamp(this.boy.x, 20, 300);
    }

    // Check proximity to girl
    const distance = Phaser.Math.Distance.Between(
      this.boy.x,
      this.boy.y,
      this.girl.x,
      this.girl.y
    );

    const near = distance < 50;
    this.promptText.setVisible(near);
    
    // When close, start the game
    if (near) {
      this.scene.start("Game");
    }
  }
}
