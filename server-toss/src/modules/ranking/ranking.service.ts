import { Transactional } from "@mikro-orm/decorators/legacy";
import { EntityManager } from "@mikro-orm/mysql";
import { Injectable } from "@nestjs/common";
import { getSeoulDayRange } from "src/common/util/time.util";
import { Drawing } from "../drawing/drawing.entity";
import { DrawingRepository } from "../drawing/drawing.repository";
import { User } from "../user/user.entity";
import { Ranking } from "./ranking.entity";
import {
  mapRankingToPodiumItem,
  mapRankingToRankingGalleryItem,
} from "./ranking.mapper";
import { RankingRepository } from "./ranking.repository";
import {
  type MyRankingResponse,
  type PodiumResponse,
  type RankingListResponse,
} from "./types/ranking.type";

// updateRanking 결과. 알림 트리거(OVERTAKEN) 발송을 위해 변화 정보를 반환한다.
// changed=false면 점수가 더 낮아 갱신 안 함. 그 외엔 newRank·overtakenUserKeys 사용.
export type RankingChangeResult =
  | { changed: false }
  | {
      changed: true;
      newRank: number; // TOP100 밖이면 0 (정렬 불가)
      overtakenUserKeys: number[];
    };

const OVERTAKEN_LIMIT = 100;

@Injectable()
export class RankingService {
  constructor(
    private readonly em: EntityManager,
    private readonly rankingRepository: RankingRepository,
    private readonly drawingRepository: DrawingRepository,
  ) {}

  @Transactional()
  async updateRanking(
    user: User,
    drawing: Drawing,
  ): Promise<RankingChangeResult> {
    const existing = await this.rankingRepository.findByUserKey(user.userKey);

    // case 2: 점수가 안 좋아져서 갱신 안 함
    if (existing && !existing.isBetterThan(drawing.score)) {
      return { changed: false };
    }

    // 추월 대상은 갱신 직전에 조회 (갱신 후엔 본인 점수가 newScore라 검색 결과에 본인이 안 끼임)
    const oldScore = existing ? existing.score : -1;
    const overtakenUserKeys =
      await this.rankingRepository.findOvertakenUserKeys({
        oldScore,
        newScore: drawing.score,
        excludeUserKey: user.userKey,
        limit: OVERTAKEN_LIMIT,
      });

    if (!existing) {
      this.em.create(Ranking, {
        userKey: user.userKey,
        nickname: user.nickname,
        drawingId: drawing.id,
        score: drawing.score,
        strokes: drawing.strokes,
        submittedAt: drawing.createdAt,
      });
    } else {
      existing.update(
        drawing.id,
        drawing.strokes,
        drawing.score,
        drawing.createdAt,
      );
    }
    await this.em.flush();

    // 갱신 후 본인의 새 순위 계산
    const myRanking = await this.rankingRepository.findMyRanking(user.userKey);
    const newRank = myRanking?.rank ?? 0;

    return { changed: true, newRank, overtakenUserKeys };
  }

  async findPodium(): Promise<PodiumResponse> {
    const [rankings, participantCount] = await Promise.all([
      this.rankingRepository.findTop(3),
      this.rankingRepository.countTodayParticipants(),
    ]);

    return {
      podium: rankings.map(mapRankingToPodiumItem),
      participantCount,
    };
  }

  async findRankingList(userKey?: number): Promise<RankingListResponse> {
    const [rankings, updatedAt] = await Promise.all([
      this.rankingRepository.findTop(100),
      this.rankingRepository.findLatestUpdatedAt(),
    ]);
    const drawingDetails = await this.drawingRepository.findDrawingDetailsByIds(
      rankings.map((ranking) => ranking.drawingId),
    );
    const drawingById = new Map(
      drawingDetails.map((drawing) => [drawing.id.toString(), drawing]),
    );

    return {
      updatedAt: (updatedAt ?? new Date()).toISOString(),
      rankings: rankings.map((ranking, index) =>
        mapRankingToRankingGalleryItem(
          ranking,
          drawingById.get(ranking.drawingId.toString()),
          index,
          userKey,
        ),
      ),
    };
  }

  async findMyRanking(userKey: number): Promise<MyRankingResponse> {
    const result = await this.rankingRepository.findMyRanking(userKey);

    if (!result) {
      return {
        state: "NOT_SUBMITTED",
        message: "NOT_SUBMITTED",
      };
    }

    return {
      state: "FOUND",
      ranking: result,
    };
  }

  async cleanupRanking(): Promise<void> {
    const { start } = getSeoulDayRange();
    await this.em.nativeDelete(Ranking, {
      submittedAt: { $lt: start },
    });
  }
}
