import Phaser from "phaser";
import "./style.css";
import BootScene from "./scenes/BootScene";
import GameScene from "./scenes/GameScene";
import TitleScene from "./scenes/TitleScene";
import NorthgateScene from "./scenes/NorthgateScene";
import IceHockeyScene from "./scenes/IceHockeyScene";
import SeattleTrafficScene from "./scenes/SeattleTrafficScene";
import FarmersMarketScene from "./scenes/FarmersMarketScene";
import Void3DScene from "./scenes/Void3DScene";
import CampingScene from "./scenes/CampingScene";
import LeaderboardScene from "./scenes/LeaderboardScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  resolution: Math.min(2, window.devicePixelRatio || 1),
  width: 320,
  height: 180,
  backgroundColor: "#0a0f14",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { pixelArt: true, antialias: false, roundPixels: true },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 500, x: 0 },
      debug: false // Disabled - clean view
    }
  },
  scene: [
    BootScene,
    TitleScene,
    GameScene,
    LeaderboardScene,
    NorthgateScene,
    IceHockeyScene,
    SeattleTrafficScene,
    FarmersMarketScene,
    Void3DScene,
    CampingScene
  ],
};

new Phaser.Game(config);
