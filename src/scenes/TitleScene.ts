import Phaser from "phaser";

const BOY_ASCII = String.raw`
   _---
   (o_o)
    /|\
    / \
`;

export default class TitleScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private boy!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private speed = 80; // px/s

  constructor() { super("Title"); }

  create() {
    // Plain, non-pixel background
    this.cameras.main.setBackgroundColor("#0b0f14");

    this.add.text(160, 18, "gs-tiny-game", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#cfe8ff",
    }).setOrigin(0.5, 0.5);

    // ASCII boy as a movable text object
    this.boy = this.add.text(160, 92, BOY_ASCII, {
        // fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: "6px",            // smaller helps a lot at 320×180
        lineSpacing: 4,
        color: "#a7c7ff",
        align: "center",
        resolution: 2,              // <— sharper
    }).setOrigin(0.5);

    this.add.text(160, 140, "v0.0 — prototype boots up", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#7aa0ff",
    }).setOrigin(0.5);

    this.hint = this.add.text(160, 164, "Move with WASD/Arrows • ENTER/SPACE to start", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#cfe8ff",
    }).setOrigin(0.5);
    this.tweens.add({ targets: this.hint, alpha: 0.25, yoyo: true, duration: 800, repeat: -1 });

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
      ENTER: this.input.keyboard!.addKey("ENTER"),
      SPACE: this.input.keyboard!.addKey("SPACE"),
    };

    // Start on click or keys
    this.input.on("pointerdown", () => this.startGame());
    this.keys.ENTER.on("down", () => this.startGame());
    this.keys.SPACE.on("down", () => this.startGame());

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  update() {
    const dt = this.game.loop.delta / 1000;
    let vx = 0, vy = 0;

    if (this.cursors.left?.isDown || this.keys.A.isDown) vx -= 1;
    if (this.cursors.right?.isDown || this.keys.D.isDown) vx += 1;
    if (this.cursors.up?.isDown || this.keys.W.isDown) vy -= 1;
    if (this.cursors.down?.isDown || this.keys.S.isDown) vy += 1;

    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;
      this.boy.x += vx * this.speed * dt;
      this.boy.y += vy * this.speed * dt;

      // keep on screen (320x180 world)
      const padX = 16, padY = 12;
      this.boy.x = Phaser.Math.Clamp(this.boy.x, padX, 320 - padX);
      this.boy.y = Phaser.Math.Clamp(this.boy.y, padY + 16, 180 - padY); // leave space for title/hint
    }
  }

  private startGame() {
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("Game");
    });
    this.cameras.main.fadeOut(200, 0, 0, 0);
  }
}
