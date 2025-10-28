import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super("Game");
  }

  create() {
    // Simple grid background like your reference
    const grid = this.add.grid(160, 90, 320, 180, 16, 16, 0x0e1a24, 1, 0x1a2733, 1);
    grid.setOrigin(0.5);

    // Placeholder player (replace with sprite later)
    this.player = this.add.rectangle(160, 90, 10, 12, 0xff66ff).setOrigin(0.5);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.addKeys("W,A,S,D");
  }

  update() {
    const speed = 80; // pixels per second
    const dt = this.game.loop.delta / 1000;

    let vx = 0, vy = 0;
    const k = this.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;

    if (this.cursors.left?.isDown || k.addKey("A").isDown)  vx -= 1;
    if (this.cursors.right?.isDown || k.addKey("D").isDown) vx += 1;
    if (this.cursors.up?.isDown || k.addKey("W").isDown)    vy -= 1;
    if (this.cursors.down?.isDown || k.addKey("S").isDown)  vy += 1;

    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;
      this.player.x += vx * speed * dt;
      this.player.y += vy * speed * dt;
    }

    // Keep inside the 320x180 play area
    this.player.x = Phaser.Math.Clamp(this.player.x, 5, 320 - 5);
    this.player.y = Phaser.Math.Clamp(this.player.y, 6, 180 - 6);
  }
}
