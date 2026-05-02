export const SEED_COUNTS = {
  users: 50,
  prompts: 20,
  dailyPrompts: 1,
  drawings: 120,
  rankings: 100,
} as const;

export const SEED_TIME_ZONE = "Asia/Seoul";

export const SEED_ID_BASE = {
  users: 900_000_000n,
  prompts: 900_100_000n,
  dailyPrompts: 900_200_000n,
  drawings: 900_300_000n,
  rankings: 900_400_000n,
} as const;

export const SEED_USER_KEY_BASE = 1_900_000;

const seoulDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SEED_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const parseSeoulDateParts = (date: Date) => {
  const parts = seoulDateFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
};

export const getSeoulDayStart = (date = new Date()) => {
  const { year, month, day } = parseSeoulDateParts(date);

  return new Date(Date.UTC(year, month - 1, day) - 9 * 60 * 60 * 1000);
};
