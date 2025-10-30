/**
 * Centralized text style presets for consistent UI across all scenes
 * Using these presets ensures visual consistency and makes style changes easy
 */

/**
 * Standard dialogue text style (used in dialogue boxes)
 */
export const DIALOGUE_TEXT_STYLE = {
  fontFamily: "monospace",
  fontSize: "10px",
  color: "#dff1ff",
  wordWrap: { width: 280 },
  resolution: 2,
} as const;

/**
 * Interaction prompt style (e.g., "E to interact")
 */
export const PROMPT_TEXT_STYLE = {
  fontFamily: "monospace",
  fontSize: "10px",
  color: "#cfe8ff",
  backgroundColor: "rgba(0,0,0,0.35)",
  padding: { left: 4, right: 4, top: 2, bottom: 2 },
  resolution: 2,
} as const;

/**
 * Help hint text style (e.g., "H for Help" in bottom-right corner)
 */
export const HELP_HINT_TEXT_STYLE = {
  fontFamily: "monospace",
  fontSize: "8px",
  color: "#cfe8ff",
  backgroundColor: "rgba(0,0,0,0.4)",
  padding: { left: 3, right: 3, top: 2, bottom: 2 },
  resolution: 1,
} as const;

/**
 * Counter/stat text style (e.g., "Memories: 0/3")
 */
export const COUNTER_TEXT_STYLE = {
  fontFamily: "monospace",
  fontSize: "9px",
  color: "#ffeb3b",
  backgroundColor: "rgba(0,0,0,0.5)",
  padding: { left: 4, right: 4, top: 2, bottom: 2 },
  resolution: 1,
} as const;

/**
 * Floating message style (e.g., "Memory collected!")
 */
export const FLOATING_MESSAGE_STYLE = {
  fontFamily: "monospace",
  fontSize: "10px",
  color: "#ffeb3b",
  fontStyle: "bold",
  resolution: 2,
} as const;

/**
 * Title text style (large, centered titles)
 */
export const TITLE_TEXT_STYLE = {
  fontFamily: "monospace",
  fontSize: "12px",
  color: "#cfe8ff",
  resolution: 1,
} as const;

/**
 * Station/location sign style
 */
export const STATION_SIGN_STYLE = {
  fontFamily: "monospace",
  fontSize: "10px",
  color: "#00d4ff",
  fontStyle: "bold",
  resolution: 1,
} as const;

/**
 * Small UI label style
 */
export const SMALL_LABEL_STYLE = {
  fontFamily: "monospace",
  fontSize: "8px",
  color: "#00ff00",
  backgroundColor: "rgba(0,0,0,0.6)",
  padding: { left: 3, right: 3, top: 2, bottom: 2 },
  resolution: 1,
} as const;

/**
 * Thought bubble / NPC dialogue style
 */
export const THOUGHT_BUBBLE_STYLE = {
  fontFamily: "monospace",
  fontSize: "9px",
  color: "#cfe8ff",
  align: "center",
  backgroundColor: "rgba(0,0,0,0.7)",
  padding: { left: 4, right: 4, top: 3, bottom: 3 },
  resolution: 1,
} as const;

