// 그림 제출로 랭킹이 변경됐을 때 발행되는 도메인 이벤트.
// drawing.service.submitDrawing에서 saveDrawingWithRanking 트랜잭션 커밋 후 emit.
// 핸들러(notification.RankingChangedListener)는 비동기 처리로 사용자 응답에 영향 X.
export const RANKING_CHANGED_EVENT = "ranking.changed";

export class RankingChangedEvent {
  constructor(
    public readonly triggerUserKey: number,
    public readonly triggerDrawingId: bigint,
    public readonly newRank: number,
    public readonly overtakenUserKeys: readonly number[],
    public readonly day: string, // KST YYYYMMDD
  ) {}
}
