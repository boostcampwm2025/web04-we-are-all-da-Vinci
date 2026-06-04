export const QUEST_SECTIONS = {
  daily: {
    label: "오늘의 퀘스트",
    accentColor: "var(--color-toss-blue)",
  },
  weekly: {
    label: "주간 퀘스트",
    accentColor: "var(--color-toss-blue)",
  },
} as const;

export type QuestSectionConfig =
  (typeof QUEST_SECTIONS)[keyof typeof QUEST_SECTIONS];

export const REWARD_LABEL = {
  point: "P",
  chance: "회",
} as const satisfies Record<"point" | "chance", string>;
