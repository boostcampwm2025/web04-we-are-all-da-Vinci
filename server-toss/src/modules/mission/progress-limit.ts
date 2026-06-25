import { ProgressPeriod, type Mission } from "./entity/mission.entity";
import { MissionWindow } from "./mission-window";

/**
 * 미션 진행 케이던스(rate limit) 게이트.
 * "이 미션은 하루/주/월에 1회만 진행된다"를 미션 자기 상태(lastProgressedAt)만으로
 * 판단한다 — cross-aggregate 조회 없이 순수하게 평가되므로 processor가 순수 유지된다.
 */
export class ProgressLimit {
  constructor(private readonly period: ProgressPeriod) {}

  static of(mission: Mission): ProgressLimit {
    return new ProgressLimit(mission.progressPeriod ?? ProgressPeriod.NONE);
  }

  /** 현재 window 기준으로 이 미션이 지금 진행 가능한지. */
  allows(
    lastProgressedAt: Date | null | undefined,
    window: MissionWindow,
  ): boolean {
    if (this.period === ProgressPeriod.NONE) return true;
    return (
      lastProgressedAt == null || lastProgressedAt < window.startOf(this.period)
    );
  }
}
