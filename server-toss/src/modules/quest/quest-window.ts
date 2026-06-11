import {
  getSeoulDayRange,
  getSeoulMonthStart,
  getSeoulWeekStart,
} from "src/common/util/time.util";
import { ProgressPeriod } from "./entity/quest.entity";

/**
 * 한 요청에서 포착한 "현재 퀘스트 기간 창".
 * now()로 요청 진입점에서 1회 생성 후 아래로 전달한다 (시간을 직접 조회하지 않음).
 */
export class QuestWindow {
  constructor(
    readonly todayStart: Date,
    readonly todayEnd: Date,
    readonly weekStart: Date,
    readonly monthStart: Date,
    readonly now: Date,
  ) {}

  static now(): QuestWindow {
    const reference = new Date();
    const { start, end } = getSeoulDayRange(reference);
    return new QuestWindow(
      start,
      end,
      getSeoulWeekStart(reference),
      getSeoulMonthStart(reference),
      reference,
    );
  }

  /** 진행 케이던스 게이트용 — 해당 주기의 시작 경계. NONE은 호출 대상이 아니다. */
  startOf(period: ProgressPeriod): Date {
    switch (period) {
      case ProgressPeriod.DAY:
        return this.todayStart;
      case ProgressPeriod.WEEK:
        return this.weekStart;
      case ProgressPeriod.MONTH:
        return this.monthStart;
      default:
        throw new Error(`startOf는 주기형 period에만 사용한다: ${period}`);
    }
  }
}
