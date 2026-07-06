export const MISSION_SECTIONS = {
  daily: {
    label: "오늘의 미션",
    accentColor: "var(--color-toss-blue)",
  },
  weekly: {
    label: "주간 미션",
    accentColor: "var(--color-toss-blue)",
  },
  challenge: {
    label: "도전 미션",
    accentColor: "var(--color-gold)",
  },
} as const;

export type MissionSectionConfig =
  (typeof MISSION_SECTIONS)[keyof typeof MISSION_SECTIONS];

export const REWARD_LABEL = {
  point: "원",
  chance: "회",
} as const satisfies Record<"point" | "chance", string>;
