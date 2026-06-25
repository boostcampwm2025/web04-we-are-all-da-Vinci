// 미션 기간 라벨. 서버 기준(KST)과 동일하게 계산한다 — 일일은 KST 0시 초기화,
// 주간은 KST 월요일 0시 ~ 일요일 24시(server-toss getSeoulWeekStart와 동일 규칙).
// 디바이스 타임존에 흔들리지 않도록 KST 오프셋으로 직접 계산한다.
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const formatSeoulMonthDay = (utcMidnightSeoul: Date): string =>
  `${utcMidnightSeoul.getUTCMonth() + 1}월 ${utcMidnightSeoul.getUTCDate()}일`;

// 일일 미션은 매일 KST 0시에 초기화된다 — 예: "6월 18일 0시~24시".
export const getDailyMissionRangeLabel = (
  reference: Date = new Date(),
): string => {
  const seoulNow = new Date(reference.getTime() + SEOUL_OFFSET_MS);
  const seoulMidnight = new Date(
    Date.UTC(
      seoulNow.getUTCFullYear(),
      seoulNow.getUTCMonth(),
      seoulNow.getUTCDate(),
    ),
  );
  return `${formatSeoulMonthDay(seoulMidnight)} 0시~24시`;
};

export const getWeeklyMissionRangeLabel = (
  reference: Date = new Date(),
): string => {
  const seoulNow = new Date(reference.getTime() + SEOUL_OFFSET_MS);
  const dayOfWeek = seoulNow.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const seoulMidnight = Date.UTC(
    seoulNow.getUTCFullYear(),
    seoulNow.getUTCMonth(),
    seoulNow.getUTCDate(),
  );

  const monday = new Date(seoulMidnight - diffToMonday * DAY_MS);
  const sunday = new Date(seoulMidnight + (6 - diffToMonday) * DAY_MS);

  return `${formatSeoulMonthDay(monday)} ~ ${formatSeoulMonthDay(sunday)}`;
};
