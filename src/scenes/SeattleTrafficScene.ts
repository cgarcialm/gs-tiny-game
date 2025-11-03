import Phaser from "phaser";
import { initializeGameScene } from "../utils/sceneSetup";
import { fadeToScene } from "../utils/sceneTransitions";
import type { GameControls } from "../utils/controls";
import type { HelpMenu } from "../utils/helpMenu";
import type { PauseMenu } from "../utils/pauseMenu";

/**
 * Seattle Traffic Scene - Top-Down Lane Runner
 * Drive burgundy van through Seattle traffic to reach trailhead before 8 AM
 * Story: Hiking trip with Ceci & Ebo - late start, wrong Starbucks, traffic nightmare
 */
export default class SeattleTrafficScene extends Phaser.Scene {
  private controls!: GameControls;
  private helpMenu!: HelpMenu;
  private pauseMenu!: PauseMenu;

  constructor() {
    super("SeattleTraffic");
  }

  create() {
    // Initialize common scene elements
    const setup = initializeGameScene(this);
    this.controls = setup.controls;
    this.helpMenu = setup.helpMenu;
    this.pauseMenu = setup.pauseMenu;

    // Temporary placeholder - show we're in the scene
    this.add.text(160, 90, "Seattle Traffic Scene\n(Under Construction)", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
      align: "center"
    }).setOrigin(0.5);

    // Temporary: Press ENTER to skip to next level (for testing flow)
    this.add.text(160, 140, "Press ENTER to continue", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#888888",
      align: "center"
    }).setOrigin(0.5);

    // TODO: Implement driving game
    console.log("Seattle Traffic Scene loaded - TODO: Implement game");
  }

  update() {
    // Handle menus
    if (this.pauseMenu.isVisible() || this.helpMenu.isVisible()) {
      return;
    }

    // Temporary: Press ENTER to skip to next level (Smush playing scene)
    if (Phaser.Input.Keyboard.JustDown(this.controls.advance)) {
      console.log("Transitioning to level 3 (Smush playing)");
      this.registry.set('completedLevels', 3);
      fadeToScene(this, "Game", 1000);
    }
  }
}

