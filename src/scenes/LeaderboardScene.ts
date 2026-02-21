import Phaser from "phaser";
import { SCENES } from "../config/sceneConstants";
import type { MiniGameKey, LeaderboardEntry } from "../services/leaderboard";
import {
  fetchLeaderboard,
  formatRunDuration,
  formatSeattleArrivalFromDurationMs,
  getLocalScore,
} from "../services/leaderboard";

const MINI_GAMES: { key: MiniGameKey; label: string }[] = [
  { key: "ice_hockey", label: "ICE HOCKEY" },
  { key: "seattle_traffic", label: "SEATTLE TRAFFIC" },
  { key: "farmers_market", label: "FARMERS MARKET" },
  { key: "northgate", label: "NORTHGATE" },
];

interface LeaderboardSceneData {
  miniGame?: MiniGameKey;
  returnScene?: string;
  nextScene?: string;
}

export default class LeaderboardScene extends Phaser.Scene {
  private selectedIndex = 0;
  private returnScene?: string;
  private nextScene?: string;
  private titleText!: Phaser.GameObjects.Text;
  private tabsText!: Phaser.GameObjects.Text;
  private scoresText!: Phaser.GameObjects.Text;
  private footerText!: Phaser.GameObjects.Text;
  private localText!: Phaser.GameObjects.Text;

  constructor() {
    super("Leaderboard");
  }

  create(data: LeaderboardSceneData) {
    this.returnScene = data.returnScene;
    this.nextScene = data.nextScene;
    const initialIndex = data.miniGame
      ? Math.max(0, MINI_GAMES.findIndex((g) => g.key === data.miniGame))
      : 0;
    this.selectedIndex = initialIndex >= 0 ? initialIndex : 0;

    this.add.rectangle(160, 90, 320, 180, 0x0b0b10, 1);
    this.add.rectangle(160, 90, 300, 160, 0x000000, 0.6).setStrokeStyle(2, 0xcfe8ff);

    this.titleText = this.add.text(160, 18, "LEADERBOARD", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cfe8ff",
      fontStyle: "bold",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);

    this.tabsText = this.add.text(160, 40, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#cfe8ff",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);

    this.localText = this.add.text(20, 58, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ffeab6",
      align: "left",
      resolution: 2,
    });

    this.scoresText = this.add.text(20, 78, "Loading...", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#c9b6ff",
      align: "left",
      lineSpacing: 2,
      resolution: 2,
    });

    this.footerText = this.add.text(160, 165, "LEFT/RIGHT to switch • ENTER to continue", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#888888",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);

    this.input.keyboard?.on("keydown-LEFT", () => this.shiftTab(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.shiftTab(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.exit());
    this.input.keyboard?.on("keydown-ESC", () => this.exit());

    this.renderTabHeader();
    void this.loadScores();
  }

  private shiftTab(direction: number) {
    this.selectedIndex = (this.selectedIndex + direction + MINI_GAMES.length) % MINI_GAMES.length;
    this.renderTabHeader();
    void this.loadScores();
  }

  private renderTabHeader() {
    const parts = MINI_GAMES.map((game, index) => (index === this.selectedIndex ? `[${game.label}]` : `${game.label}`));
    const topLine = `${parts[0]}  |  ${parts[1]}`;
    const bottomLine = `${parts[2]}  |  ${parts[3]}`;
    this.tabsText.setText(`${topLine}\n${bottomLine}`);

    const miniGame = MINI_GAMES[this.selectedIndex].key;
    const best = getLocalScore(miniGame, "best");
    const bestLine = best?.duration_ms
      ? this.formatScoreLine("BEST", miniGame, best)
      : "BEST  -";
    this.localText.setText(bestLine);
  }

  private formatScoreLine(label: string, miniGame: MiniGameKey, score: { duration_ms?: number; deaths?: number }): string {
    const timeLabel =
      miniGame === "seattle_traffic"
        ? `ETA ${formatSeattleArrivalFromDurationMs(score.duration_ms ?? 0)}`
        : `T ${formatRunDuration(score.duration_ms ?? 0)}`;
    const deaths = score.deaths ?? 0;
    return `${label} ${timeLabel} D${deaths}`;
  }

  private async loadScores() {
    const miniGame = MINI_GAMES[this.selectedIndex].key;
    try {
      const entries = await fetchLeaderboard(5, miniGame);
      if (entries.length === 0) {
        this.scoresText.setText("No scores yet.");
        return;
      }
      const rows = entries.map((entry, idx) => this.formatEntryRow(entry, idx));
      this.scoresText.setText(rows.join("\n"));
    } catch {
      this.scoresText.setText("Leaderboard unavailable.");
    }
  }

  private formatEntryRow(entry: LeaderboardEntry, index: number): string {
    const nameTag = entry.player_name.slice(0, 10);
    const deaths = entry.deaths ?? 0;
    const score =
      entry.mini_game === "seattle_traffic"
        ? `ETA ${formatSeattleArrivalFromDurationMs(entry.duration_ms ?? 0)}`
        : `T ${formatRunDuration(entry.duration_ms ?? 0)}`;
    return `${index + 1}. ${nameTag} ${score} D${deaths}`;
  }

  private exit() {
    if (this.nextScene) {
      this.scene.start(this.nextScene);
      return;
    }
    if (this.returnScene) {
      this.scene.stop();
      this.scene.resume(this.returnScene);
      return;
    }
    this.scene.start(SCENES.TITLE);
  }
}
