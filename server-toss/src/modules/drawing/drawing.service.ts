import { preprocessStrokes, scoreFinalSimilarity } from "@davinci/similarity";
import { EntityManager, QueryOrder } from "@mikro-orm/core";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { getSeoulDayRange } from "src/common/time.util";
import { TossApiClient } from "src/modules/auth/toss-api.client";
import {
  TossPromotionError,
  TossTransportError,
} from "src/modules/auth/errors/toss.errors";
import { PointService } from "src/modules/point/point.service";
import { Prompt } from "../prompt/prompt.entity";
import { PromptService } from "../prompt/prompt.service";
import { UserRepository } from "../user/user.repository";
import { Drawing } from "./drawing.entity";

const TEMP_PROMOTION_CODE = "TEMP_PROMOTION_CODE";
const PROMOTION_AMOUNT = 2;
const PROMOTION_MAX_RETRIES = 2;

type Similarity = ReturnType<typeof scoreFinalSimilarity>;

@Injectable()
export class DrawingService {
  private readonly logger = new Logger(DrawingService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly userRepo: UserRepository,
    private readonly promptService: PromptService,
    private readonly pointService: PointService,
    private readonly tossApiClient: TossApiClient,
  ) {}

  // 획 단위 실시간 호출 엔드포인트. 클라 값 신뢰 X → 서버가 매번 유사도 재계산
  async scoreStrokes(playerStrokes: Stroke[], date: Date): Promise<Similarity> {
    const { preprocessed } =
      await this.promptService.getPreprocessedByDate(date);
    const playerPreprocessed = preprocessStrokes(playerStrokes);
    return scoreFinalSimilarity(preprocessed, playerPreprocessed);
  }

  // 최종 제출. 유사도를 다시 계산해 저장 (클라가 보낸 similarity는 사용하지 않음)
  async submitDrawing(
    userKey: string,
    playerStrokes: Stroke[],
    date: Date,
  ): Promise<{ drawingId: number; similarity: Similarity }> {
    const { promptId, preprocessed } =
      await this.promptService.getPreprocessedByDate(date);
    const playerPreprocessed = preprocessStrokes(playerStrokes);
    const similarity = scoreFinalSimilarity(preprocessed, playerPreprocessed);

    const user = await this.userRepo.findOne({ userKey: Number(userKey) });
    if (!user) {
      throw new NotFoundException("USER_NOT_FOUND");
    }

    // FK만 필요 — DB 조회 없이 id만으로 참조 객체 생성 (findOne 대체 최적화)
    const promptRef = this.em.getReference(Prompt, BigInt(promptId));
    const drawing = new Drawing();
    drawing.user = user;
    drawing.prompt = promptRef;
    drawing.strokes = JSON.stringify(playerStrokes);
    drawing.similarity = JSON.stringify(similarity);
    drawing.score = similarity.score;

    // MikroORM v7: persist로 UoW 등록 후 flush로 일괄 커밋
    this.em.persist(drawing);
    await this.em.flush();

    await this.grantPromotionIfEligible(user.id, user.userKey);

    return { drawingId: Number(drawing.id), similarity };
  }

  private async grantPromotionIfEligible(
    userId: bigint,
    userKey: number,
  ): Promise<void> {
    const canGrant = await this.pointService.canGrantTodayPromotion(userId);
    if (!canGrant) return;

    let lastError: unknown;

    for (let attempt = 0; attempt <= PROMOTION_MAX_RETRIES; attempt++) {
      try {
        const key = await this.tossApiClient.getPromotionKey(userKey);
        await this.tossApiClient.executePromotion(
          userKey,
          key,
          TEMP_PROMOTION_CODE,
          PROMOTION_AMOUNT,
        );
        await this.pointService.saveDrawingPointLog(userId);
        return;
      } catch (err) {
        if (
          err instanceof TossTransportError ||
          (err instanceof TossPromotionError && err.errorCode === "4110")
        ) {
          lastError = err;
          continue;
        }
        this.logger.warn({ err }, "프로모션 지급 실패 (재시도 불필요)");
        return;
      }
    }

    this.logger.warn({ err: lastError }, "프로모션 지급 최대 재시도 초과");
  }

  private async findTodayByUser(userId: bigint | string): Promise<Drawing[]> {
    const { start, end } = getSeoulDayRange();
    return this.em.find(
      Drawing,
      { user: userId, createdAt: { $gte: start, $lt: end } },
      {
        populate: ["user", "prompt"],
        orderBy: [{ score: QueryOrder.DESC }],
      },
    );
  }

  async getMyDrawings(userId: bigint) {
    const { start, end } = getSeoulDayRange();
    const userIdString = userId.toString();
    const myDrawings = await this.findTodayByUser(userIdString);

    if (myDrawings.length === 0) {
      return { userId: userIdString, drawings: [] };
    }

    // 그림의 등수 정보를 가져오기 위해 같은 prompt의 그림들을 모두 가져와서 순위 계산
    const promptIds = myDrawings.map((d) => d.prompt.id);
    const allDrawings = await this.em.find(Drawing, {
      prompt: { $in: promptIds },
      createdAt: { $gte: start, $lt: end },
    });

    const drawings = myDrawings.map((drawing) => {
      const rank =
        allDrawings.filter(
          (d) => d.prompt.id === drawing.prompt.id && d.score > drawing.score,
        ).length + 1;

      return {
        drawingId: Number(drawing.id),
        drawRanking: rank,
        strokes: JSON.parse(drawing.strokes) as Stroke[],
        score: drawing.score,
        similarity: JSON.parse(drawing.similarity) as SimilarityResponse,
      };
    });

    return { userId: userIdString, drawings };
  }

  async getDrawing(drawingId: string) {
    const drawing = await this.em.findOne(
      Drawing,
      { id: BigInt(drawingId) },
      { populate: ["prompt", "user"] },
    );

    if (!drawing) {
      return null;
    }

    const { start, end } = getSeoulDayRange(drawing.createdAt);
    const allDrawings = await this.em.find(Drawing, {
      prompt: drawing.prompt.id,
      createdAt: { $gte: start, $lt: end },
    });
    const drawRanking =
      allDrawings.filter(
        (other) =>
          other.prompt.id === drawing.prompt.id && other.score > drawing.score,
      ).length + 1;

    return {
      drawingId: Number(drawing.id),
      name: drawing.user.name,
      drawRanking,
      strokes: JSON.parse(drawing.strokes) as Stroke[],
      similarity: JSON.parse(drawing.similarity) as SimilarityResponse,
    };
  }
}
