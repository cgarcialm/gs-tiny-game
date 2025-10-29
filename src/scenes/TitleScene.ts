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

type DialogueState = "idle" | "open";

export default class TitleScene extends Phaser.Scene {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private boy!: Phaser.GameObjects.Text;
  private girl!: Phaser.GameObjects.Text;
  private dialogState: DialogueState = "idle";
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
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

    // Dialogue UI (hidden)
    this.createDialogUI();
    this.hideDialog();

    // Input
    this.keys = {
      A: this.input.keyboard!.addKey("A"),
      D: this.input.keyboard!.addKey("D"),
      SPACE: this.input.keyboard!.addKey("SPACE"),
      ENTER: this.input.keyboard!.addKey("ENTER"),
    };
  }

  private createDialogUI() {
    this.dialogBox = this.add
      .rectangle(160, 160, 300, 40, 0x000000, 0.8)
      .setStrokeStyle(1, 0x99bbff, 0.9)
      .setOrigin(0.5);

    this.dialogText = this.add
      .text(20, 146, "Hey! Welcome to the game!", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#dff1ff",
        wordWrap: { width: 280 },
        resolution: 2,
      })
      .setOrigin(0, 0);
  }

  private showDialog(message: string) {
    this.dialogState = "open";
    this.dialogBox.setVisible(true);
    this.dialogText.setText(message).setVisible(true);
  }

  private hideDialog() {
    this.dialogState = "idle";
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
  }

  update() {
    // If dialogue is open, only handle dialog controls
    if (this.dialogState === "open") {
      if (
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
        Phaser.Input.Keyboard.JustDown(this.keys.ENTER)
      ) {
        this.hideDialog();
        this.scene.start("Game");
      }
      return;
    }

    const dt = this.game.loop.delta / 1000;
    let vx = 0;

    // Only A/D movement (no arrows)
    if (this.keys.A.isDown) vx -= 1;
    if (this.keys.D.isDown) vx += 1;

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

    const near = distance < 30;
    
    // When close to girl, show dialogue
    if (near && this.dialogState === "idle") {
      this.showDialog("Hey! Press SPACE to start the game!");
    }
  }
}
