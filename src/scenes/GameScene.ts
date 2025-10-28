import Phaser from "phaser";

type DialogueState = "idle" | "open";

export default class GameScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private player!: Phaser.GameObjects.Rectangle;
  private npc!: Phaser.GameObjects.Rectangle;

  private speed = 80; // px/s
  private promptText!: Phaser.GameObjects.Text;

  // dialogue UI
  private dialogState: DialogueState = "idle";
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogLines: string[] = [
    "Hey there! Nice neon grid, huh?",
    "Use WASD/Arrows to move.",
    "Press Esc to close. Space/Enter to continue."
  ];
  private dialogIndex = 0;

  constructor() {
    super("Game");
  }

  create() {
    // Pixel grid background (procedural)
    this.add
      .grid(160, 90, 320, 180, 16, 16, 0x0e1a24, 1, 0x1a2733, 0.8)
      .setOrigin(0.5);

    // Player (keyboard controlled)
    this.player = this.add.rectangle(160, 90, 10, 12, 0xff66ff).setOrigin(0.5);

    // NPC (static)
    this.npc = this.add.rectangle(220, 95, 10, 12, 0x66d9ff).setOrigin(0.5);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
      E: this.input.keyboard!.addKey("E"),
      SPACE: this.input.keyboard!.addKey("SPACE"),
      ENTER: this.input.keyboard!.addKey("ENTER"),
      ESC: this.input.keyboard!.addKey("ESC"),
    };

    // “Press E to talk” prompt (hidden by default)
    this.promptText = this.add
      .text(0, 0, "E to talk", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#cfe8ff",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Dialogue UI (hidden)
    this.createDialogUI();
    this.hideDialog();
  }

  private createDialogUI() {
    this.dialogBox = this.add
      .rectangle(160, 160, 300, 40, 0x000000, 0.6)
      .setStrokeStyle(1, 0x99bbff, 0.9)
      .setOrigin(0.5);

    this.dialogText = this.add
      .text(20, 146, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#dff1ff",
        wordWrap: { width: 280 },
      })
      .setOrigin(0, 0);
  }

  private showDialog(line: string) {
    this.dialogState = "open";
    this.dialogBox.setVisible(true);
    this.dialogText.setText(line).setVisible(true);
  }

  private hideDialog() {
    this.dialogState = "idle";
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
  }

  private advanceDialog() {
    this.dialogIndex++;
    if (this.dialogIndex >= this.dialogLines.length) {
      this.dialogIndex = 0;
      this.hideDialog();
    } else {
      this.showDialog(this.dialogLines[this.dialogIndex]);
    }
  }

  update() {
    const dt = this.game.loop.delta / 1000;

    // If in dialogue, only allow closing/advancing; no movement
    if (this.dialogState === "open") {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.hideDialog();
      if (
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
        Phaser.Input.Keyboard.JustDown(this.keys.ENTER)
      ) {
        this.advanceDialog();
      }
      return;
    }

    // Movement (keyboard only)
    let vx = 0,
      vy = 0;
    if (this.cursors.left?.isDown || this.keys.A.isDown) vx -= 1;
    if (this.cursors.right?.isDown || this.keys.D.isDown) vx += 1;
    if (this.cursors.up?.isDown || this.keys.W.isDown) vy -= 1;
    if (this.cursors.down?.isDown || this.keys.S.isDown) vy += 1;

    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
    }
    this.player.x += vx * this.speed * dt;
    this.player.y += vy * this.speed * dt;

    // Keep inside 320x180 play area (tiny padding)
    this.player.x = Phaser.Math.Clamp(this.player.x, 6, 320 - 6);
    this.player.y = Phaser.Math.Clamp(this.player.y, 6, 180 - 6);

    // Proximity check to NPC
    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.npc.x,
      this.npc.y
    );

    const near = d < 18; // distance threshold to show prompt
    this.promptText.setVisible(near);
    if (near) {
      // anchor prompt above NPC
      this.promptText.setPosition(this.npc.x, this.npc.y - 14);

      // Press E to talk
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.dialogIndex = 0;
        this.showDialog(this.dialogLines[this.dialogIndex]);
      }
    }
  }
}
