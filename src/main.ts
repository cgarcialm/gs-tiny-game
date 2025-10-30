import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import GameScene from "./scenes/GameScene";
import TitleScene from "./scenes/TitleScene";
import NorthgateScene from "./scenes/NorthgateScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 320,
  height: 180,
  backgroundColor: "#0a0f14",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { pixelArt: true, antialias: false, roundPixels: true },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 500, x: 0 },
      debug: false
    }
  },
  scene: [BootScene, TitleScene, GameScene, NorthgateScene],
};

new Phaser.Game(config);
