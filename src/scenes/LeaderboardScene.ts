import Phaser from "phaser";
import { SCENES } from "../config/sceneConstants";
import { API_BASE_URL } from "../config/leaderboard";
import type { MiniGameKey, LeaderboardEntry } from "../services/leaderboard";
import {
  fetchLeaderboard,
  formatRunDuration,
  formatSeattleArrivalFromDurationMs,
} from "../services/leaderboard";
import { CheatConsole } from "../utils/cheatConsole";

type LeaderboardTab = { key: MiniGameKey | "all"; label: string };

const MINI_GAMES: LeaderboardTab[] = [
  { key: "all", label: "ALL GAMES" },
  { key: "northgate", label: "NORTHGATE" },
  { key: "ice_hockey", label: "ICE HOCKEY" },
  { key: "seattle_traffic", label: "SEATTLE TRAFFIC" },
  { key: "farmers_market", label: "FARMERS MARKET" },
  { key: "full_run", label: "FULL RUN" },
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
  private tabsText!: Phaser.GameObjects.Text;
  private selectedTabText!: Phaser.GameObjects.Text;
  private scoresText!: Phaser.GameObjects.Text;
  private localText!: Phaser.GameObjects.Text;
  private globalTitleText!: Phaser.GameObjects.Text;
  private globalScoresText!: Phaser.GameObjects.Text;
  private loadRequestId = 0;
  private allLabelText!: Phaser.GameObjects.Text;
  private allValueText!: Phaser.GameObjects.Text;
  private allBestCache: { labels: string; values: string; updatedAt: number } | null = null;
  private tabCache = new Map<string, LeaderboardEntry[]>();
  private retryCount = 0;
  private initialMiniGame?: MiniGameKey;
  private tabsLocked = true;
  private openedAtMs = 0;
  // @ts-ignore - CheatConsole used for side effects (global keyboard listener)
  private _cheatConsole?: CheatConsole;

  constructor() {
    super("Leaderboard");
  }

  create(data: LeaderboardSceneData) {
    this.returnScene = data.returnScene;
    this.nextScene = data.nextScene;
    this.initialMiniGame = data.miniGame;
    this.openedAtMs = this.time.now;
    this._cheatConsole = new CheatConsole(this);
    const initialIndex = data.miniGame
      ? Math.max(0, MINI_GAMES.findIndex((g) => g.key === data.miniGame))
      : 0;
    this.selectedIndex = initialIndex >= 0 ? initialIndex : 0;

    this.add.rectangle(160, 90, 320, 180, 0x0b0b10, 1);
    this.add.rectangle(160, 90, 300, 160, 0x000000, 0.6).setStrokeStyle(2, 0x00d4ff);

    this.add.text(160, 26, "LEADERBOARD", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#00d4ff",
      fontStyle: "bold",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);

    this.tabsText = this.add.text(160, 50, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#9ee6ff",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);
    
    this.selectedTabText = this.add.text(160, 50, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ffffff",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);

    this.localText = this.add.text(20, 72, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#ffeab6",
      align: "left",
      resolution: 3,
    });

    this.scoresText = this.add.text(20, 88, "Loading...", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#e7d8ff",
      align: "left",
      lineSpacing: 2,
      resolution: 4,
    });
    this.scoresText.setShadow(0, 0, "#c9b6ff", 2, false, true);

    this.allLabelText = this.add.text(56, 88, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#9ee6ff",
      align: "left",
      lineSpacing: 2,
      resolution: 3,
    }).setOrigin(0, 0).setVisible(false);

    this.allValueText = this.add.text(160, 88, "", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#e7d8ff",
      align: "left",
      lineSpacing: 2,
      resolution: 4,
    }).setOrigin(0, 0).setVisible(false);
    this.allValueText.setShadow(0, 0, "#c9b6ff", 2, false, true);

    this.globalTitleText = this.add.text(178, 72, "LATEST", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#9ee6ff",
      align: "left",
      resolution: 3,
    });

    this.globalScoresText = this.add.text(178, 88, "Loading...", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#e7d8ff",
      align: "left",
      lineSpacing: 2,
      resolution: 4,
    });
    this.globalScoresText.setShadow(0, 0, "#c9b6ff", 2, false, true);

    this.add.text(160, 165, "LEFT/RIGHT to switch • L/ENTER to continue", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#888888",
      align: "center",
      resolution: 2,
    }).setOrigin(0.5);

    const leftKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const rightKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.tabsLocked = true;
    const unlockIfReleased = () => {
      if (!leftKey?.isDown && !rightKey?.isDown) {
        this.tabsLocked = false;
      }
    };
    this.time.delayedCall(150, unlockIfReleased);

    this.input.keyboard?.on("keydown-LEFT", () => {
      if (this.tabsLocked) return;
      this.shiftTab(-1);
    });
    this.input.keyboard?.on("keydown-RIGHT", () => {
      if (this.tabsLocked) return;
      this.shiftTab(1);
    });
    this.input.keyboard?.on("keydown-L", () => this.exit());
    this.input.keyboard?.on("keydown-ENTER", () => this.exit());
    this.input.keyboard?.on("keyup-LEFT", () => {
      unlockIfReleased();
    });
    this.input.keyboard?.on("keyup-RIGHT", () => {
      unlockIfReleased();
    });

    this.renderTabHeader();
    void this.loadScores();
  }

  private shiftTab(direction: number) {
    const total = MINI_GAMES.length;
    if (total === 0) return;
    this.selectedIndex = (this.selectedIndex + direction + total) % total;
    this.retryCount = 0;
    this.renderTabHeader();
    void this.loadScores();
  }

  private renderTabHeader() {
    const labels = MINI_GAMES.map((game) => game.label);
    const line1 = `${labels[0] ?? ""}`;
    const line2 = `${labels[1] ?? ""} | ${labels[2] ?? ""} | ${labels[3] ?? ""} | ${labels[4] ?? ""}`;
    const line3 = `${labels[5] ?? ""}`;
    this.tabsText.setText(`${line1}\n${line2}\n${line3}`);

    const selectedLine1 = this.selectedIndex === 0 ? line1 : " ".repeat(line1.length);
    const segmentsLine2 = [labels[1] ?? "", labels[2] ?? "", labels[3] ?? "", labels[4] ?? ""];
    const segmentsLine3 = [labels[5] ?? ""];
    const selectedLine2 = segmentsLine2
      .map((seg, idx) => {
        const tabIndex = idx + 1;
        return this.selectedIndex === tabIndex ? seg : " ".repeat(seg.length);
      })
      .join(" | ");
    const selectedLine3 = segmentsLine3
      .map((seg, idx) => {
        const tabIndex = idx + 5;
        return this.selectedIndex === tabIndex ? seg : " ".repeat(seg.length);
      })
      .join("");
    this.selectedTabText.setText(`${selectedLine1}\n${selectedLine2}\n${selectedLine3}`);
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

  private async loadScores() {
    const requestId = ++this.loadRequestId;
    if (this.initialMiniGame) {
      const targetIndex = MINI_GAMES.findIndex((g) => g.key === this.initialMiniGame);
      if (targetIndex >= 0 && this.selectedIndex !== targetIndex) {
        this.selectedIndex = targetIndex;
      }
      this.initialMiniGame = undefined;
      this.renderTabHeader();
    }
    if (this.selectedIndex < 0 || this.selectedIndex >= MINI_GAMES.length) {
      this.selectedIndex = 0;
    }
    const miniGame = MINI_GAMES[this.selectedIndex].key;
    try {
      if (miniGame === "all") {
        this.scoresText.setOrigin(0.5, 0).setX(160).setAlign("center");
        this.localText.setOrigin(0.5, 0).setX(160).setAlign("center");
        const now = Date.now();
        if (this.allBestCache && now - this.allBestCache.updatedAt < 10000) {
          this.allLabelText.setText(this.allBestCache.labels);
          this.allValueText.setText(this.allBestCache.values);
          return;
        }

        const bestByGame: Partial<Record<MiniGameKey, LeaderboardEntry | undefined>> = {};
        const miniGames: MiniGameKey[] = [
          "ice_hockey",
          "seattle_traffic",
          "farmers_market",
          "northgate",
          "full_run",
        ];
        for (const key of miniGames) {
          try {
            const entries = await fetchLeaderboard(1, key);
            if (requestId !== this.loadRequestId) return;
            if (entries.length > 0) {
              bestByGame[key] = entries[0];
              this.tabCache.set(key, entries);
            } else {
              bestByGame[key] = this.tabCache.get(key)?.[0];
            }
          } catch {
            bestByGame[key] = this.tabCache.get(key)?.[0];
          }
        }
        const ice = bestByGame.ice_hockey;
        const sea = bestByGame.seattle_traffic;
        const farm = bestByGame.farmers_market;
        const ng = bestByGame.northgate;
        const full = bestByGame.full_run;
        const rows = [
          this.formatTopRowParts("ICE HOCKEY", ice),
          this.formatTopRowParts("SEATTLE TRAFFIC", sea),
          this.formatTopRowParts("FARMERS MARKET", farm),
          this.formatTopRowParts("NORTHGATE", ng),
          this.formatTopRowParts("FULL RUN", full),
        ];
        const labels = rows.map((row) => row.label).join("\n");
        const values = rows.map((row) => row.value).join("\n");
        this.allLabelText.setText(labels);
        this.allValueText.setText(values);
        const hasMissing = rows.some((row) => row.value === "-");
        if (!hasMissing) {
          this.allBestCache = { labels, values, updatedAt: now };
        } else if (this.allBestCache) {
          this.allBestCache = null;
        }
        if (hasMissing && this.retryCount < 2) {
          this.retryCount += 1;
          this.time.delayedCall(800, () => {
            if (requestId === this.loadRequestId) {
              void this.loadScores();
            }
          });
        }
        return;
      }

      this.scoresText.setOrigin(0, 0).setX(20).setAlign("left");
      this.localText.setOrigin(0, 0).setX(20).setAlign("left");
      const entries = await fetchLeaderboard(5, miniGame);
      if (requestId !== this.loadRequestId) return;
      const cacheKey = miniGame;
      const useEntries = entries.length > 0 ? entries : this.tabCache.get(cacheKey) ?? [];
      if (useEntries.length === 0) {
        this.scoresText.setText("No scores yet.");
        if (this.retryCount < 2) {
          this.retryCount += 1;
          this.time.delayedCall(800, () => {
            if (requestId === this.loadRequestId) {
              void this.loadScores();
            }
          });
        }
      } else {
        this.tabCache.set(cacheKey, useEntries);
        this.allBestCache = null;
        const top = useEntries[0];
        const topLine = this.formatEntryRow(top, 0).replace(/^1\s*/, "");
        this.localText.setText(`BEST ${topLine}`);
        const rows = useEntries.slice(1).map((entry, idx) => this.formatEntryRow(entry, idx + 1));
        this.scoresText.setText(rows.join("\n"));
      }

      const latestEntries = await fetchLeaderboard(3, miniGame, { sort: "latest" });
      if (requestId !== this.loadRequestId) return;
      const latest = latestEntries.length > 0 ? latestEntries : useEntries.slice(0, 3);
      if (latest.length === 0) {
        this.globalScoresText.setText("No scores.");
      } else {
        const rows = latest.map((entry, idx) => this.formatEntryRow(entry, idx));
        this.globalScoresText.setText(rows.join("\n"));
      }
    } catch {
      const hint = API_BASE_URL ? `\nAPI: ${API_BASE_URL}` : "\nAPI not set";
      this.scoresText.setText(`Leaderboard unavailable.${hint}`);
      this.globalScoresText.setText(`Unavailable.${hint}`);
    }
  }

  private formatTopRowParts(label: string, top: LeaderboardEntry | undefined): { label: string; value: string } {
    if (!top) return { label: `${label}:`, value: "-" };
    const score =
      top.mini_game === "seattle_traffic"
        ? `${formatSeattleArrivalFromDurationMs(top.duration_ms ?? 0)}`
        : `${formatRunDuration(top.duration_ms ?? 0)}`;
    const nameTag = top.player_name.slice(0, 8);
    const deaths = top.deaths ?? 0;
    return { label: `${label}:`, value: `${nameTag} ${score} (${deaths})` };
  }

  private formatEntryRow(entry: LeaderboardEntry, index: number): string {
    const nameTag = entry.player_name.slice(0, 8);
    const score =
      entry.mini_game === "seattle_traffic"
        ? `${formatSeattleArrivalFromDurationMs(entry.duration_ms ?? 0)}`
        : `${formatRunDuration(entry.duration_ms ?? 0)}`;
    const deaths = entry.deaths ?? 0;
    return `${index + 1} ${nameTag} ${score} (${deaths})`;
  }

  private exit() {
    if (this.time.now - this.openedAtMs < 300) return;
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
