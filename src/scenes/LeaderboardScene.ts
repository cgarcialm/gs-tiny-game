import Phaser from "phaser";
import { SCENES } from "../config/sceneConstants";
import type { MiniGameKey, LeaderboardEntry } from "../services/leaderboard";
import {
  fetchLeaderboard,
  formatRunDuration,
  formatSeattleArrivalFromDurationMs,
} from "../services/leaderboard";

type LeaderboardTab = { key: MiniGameKey | "all"; label: string };

const MINI_GAMES: LeaderboardTab[] = [
  { key: "all", label: "ALL GAMES" },
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
  private globalTitleText!: Phaser.GameObjects.Text;
  private globalScoresText!: Phaser.GameObjects.Text;
  private loadRequestId = 0;
  private allLabelText!: Phaser.GameObjects.Text;
  private allValueText!: Phaser.GameObjects.Text;

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
    this.add.rectangle(160, 90, 300, 160, 0x000000, 0.6).setStrokeStyle(2, 0x00d4ff);

    this.titleText = this.add.text(160, 26, "LEADERBOARD", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#00d4ff",
      fontStyle: "bold",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);

    this.tabsText = this.add.text(160, 50, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#9ee6ff",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);

    this.localText = this.add.text(20, 72, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ffeab6",
      align: "left",
      resolution: 2,
    });

    this.scoresText = this.add.text(20, 88, "Loading...", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#c9b6ff",
      align: "left",
      lineSpacing: 2,
      resolution: 2,
    });

    this.allLabelText = this.add.text(70, 88, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#9ee6ff",
      align: "left",
      lineSpacing: 2,
      resolution: 2,
    }).setOrigin(0, 0).setVisible(false);

    this.allValueText = this.add.text(160, 88, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#c9b6ff",
      align: "left",
      lineSpacing: 2,
      resolution: 2,
    }).setOrigin(0, 0).setVisible(false);

    this.globalTitleText = this.add.text(178, 72, "LATEST", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#9ee6ff",
      align: "left",
      resolution: 2,
    });

    this.globalScoresText = this.add.text(178, 88, "Loading...", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#c9b6ff",
      align: "left",
      lineSpacing: 2,
      resolution: 2,
    });

    this.footerText = this.add.text(160, 165, "LEFT/RIGHT to switch • ESC to continue", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#888888",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);

    this.input.keyboard?.on("keydown-LEFT", () => this.shiftTab(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.shiftTab(1));
    this.input.keyboard?.on("keydown-ESC", () => this.exit());

    this.renderTabHeader();
    void this.loadScores();
  }

  private shiftTab(direction: number) {
    const total = MINI_GAMES.length;
    if (total === 0) return;
    this.selectedIndex = (this.selectedIndex + direction + total) % total;
    this.renderTabHeader();
    void this.loadScores();
  }

  private renderTabHeader() {
    const parts = MINI_GAMES.map((game, index) => (index === this.selectedIndex ? `[${game.label}]` : `${game.label}`));
    const line1 = `${parts[0] ?? ""}`;
    const line2 = `${parts[1] ?? ""} | ${parts[2] ?? ""} | ${parts[3] ?? ""} | ${parts[4] ?? ""}`;
    this.tabsText.setText(`${line1}\n${line2}`);
    const isAll = MINI_GAMES[this.selectedIndex]?.key === "all";
    if (isAll) {
      this.localText.setText("BEST BY GAME");
    } else {
      this.localText.setText("BEST -");
    }
    this.globalScoresText.setText("Loading...");
    this.globalTitleText.setVisible(!isAll);
    this.globalScoresText.setVisible(!isAll);
    this.allLabelText.setVisible(isAll);
    this.allValueText.setVisible(isAll);
    this.scoresText.setVisible(!isAll);
  }

  private formatScoreLine(label: string, miniGame: MiniGameKey, score: { duration_ms?: number; deaths?: number }): string {
    const timeLabel =
      miniGame === "seattle_traffic"
        ? `ETA ${formatSeattleArrivalFromDurationMs(score.duration_ms ?? 0)}`
        : `T ${formatRunDuration(score.duration_ms ?? 0)}`;
    const deaths = score.deaths ?? 0;
    return `${label} ${timeLabel} (${deaths})`;
  }

  private async loadScores() {
    const requestId = ++this.loadRequestId;
    if (this.selectedIndex < 0 || this.selectedIndex >= MINI_GAMES.length) {
      this.selectedIndex = 0;
    }
    const miniGame = MINI_GAMES[this.selectedIndex].key;
    try {
      const allEntries = await fetchLeaderboard(20);
      if (requestId !== this.loadRequestId) return;

      if (miniGame === "all") {
        this.scoresText.setOrigin(0.5, 0).setX(160).setAlign("center");
        this.localText.setOrigin(0.5, 0).setX(160).setAlign("center");
        const bestByGame = new Map<string, LeaderboardEntry>();
        for (const entry of allEntries) {
          const key = entry.mini_game;
          const current = bestByGame.get(key);
          if (!current) {
            bestByGame.set(key, entry);
            continue;
          }
          const a = entry.duration_ms ?? Number.POSITIVE_INFINITY;
          const b = current.duration_ms ?? Number.POSITIVE_INFINITY;
          if (a < b || (a === b && (entry.deaths ?? 0) < (current.deaths ?? 0))) {
            bestByGame.set(key, entry);
          }
        }
        const rows = [
          this.formatTopRowParts("ICE HOCKEY", bestByGame.get("ice_hockey")),
          this.formatTopRowParts("SEATTLE TRAFFIC", bestByGame.get("seattle_traffic")),
          this.formatTopRowParts("FARMERS MARKET", bestByGame.get("farmers_market")),
          this.formatTopRowParts("NORTHGATE", bestByGame.get("northgate")),
        ];
        this.allLabelText.setText(rows.map((row) => row.label).join("\n"));
        this.allValueText.setText(rows.map((row) => row.value).join("\n"));
        return;
      }

      this.scoresText.setOrigin(0, 0).setX(20).setAlign("left");
      this.localText.setOrigin(0, 0).setX(20).setAlign("left");
      const entries = await fetchLeaderboard(5, miniGame);
      if (requestId !== this.loadRequestId) return;
      if (entries.length === 0) {
        this.scoresText.setText("No scores yet.");
      } else {
        const top = entries[0];
        const topLine = this.formatEntryRow(top, 0).replace(/^1\.\s*/, "");
        this.localText.setText(`BEST ${topLine}`);
        const rows = entries.slice(1).map((entry, idx) => this.formatEntryRow(entry, idx + 1));
        this.scoresText.setText(rows.length > 0 ? rows.join("\n") : "No more scores.");
      }
      const latest = entries.slice(0, 3);
      if (latest.length === 0) {
        this.globalScoresText.setText("No scores.");
      } else {
        const rows = latest.map((entry, idx) => this.formatEntryRow(entry, idx));
        this.globalScoresText.setText(rows.join("\n"));
      }
    } catch {
      this.scoresText.setText("Leaderboard unavailable.");
      this.globalScoresText.setText("Unavailable.");
    }
  }

  private formatTopRow(label: string, top: LeaderboardEntry | undefined): string {
    if (!top) return `${label}: -`;
    const score =
      top.mini_game === "seattle_traffic"
        ? `ETA ${formatSeattleArrivalFromDurationMs(top.duration_ms ?? 0)}`
        : `T ${formatRunDuration(top.duration_ms ?? 0)}`;
    const nameTag = top.player_name.slice(0, 10);
    const deaths = top.deaths ?? 0;
    return `${label}: ${nameTag} ${score} (${deaths})`;
  }

  private formatTopRowParts(label: string, top: LeaderboardEntry | undefined): { label: string; value: string } {
    if (!top) return { label: `${label}:`, value: "-" };
    const score =
      top.mini_game === "seattle_traffic"
        ? `ETA ${formatSeattleArrivalFromDurationMs(top.duration_ms ?? 0)}`
        : `T ${formatRunDuration(top.duration_ms ?? 0)}`;
    const nameTag = top.player_name.slice(0, 10);
    const deaths = top.deaths ?? 0;
    return { label: `${label}:`, value: `${nameTag} ${score} (${deaths})` };
  }

  private formatEntryRow(entry: LeaderboardEntry, index: number): string {
    const nameTag = entry.player_name.slice(0, 10);
    const score =
      entry.mini_game === "seattle_traffic"
        ? `ETA ${formatSeattleArrivalFromDurationMs(entry.duration_ms ?? 0)}`
        : `T ${formatRunDuration(entry.duration_ms ?? 0)}`;
    const deaths = entry.deaths ?? 0;
    return `${index + 1} ${nameTag} ${score} (${deaths})`;
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
