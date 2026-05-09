import { preprocessStrokes, scoreFinalSimilarity } from "@davinci/similarity";
import { EntityManager } from "@mikro-orm/mysql";
import { HttpException, Injectable, Logger } from "@nestjs/common";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { getSeoulDayRange } from "src/common/util/time.util";
import { PointService } from "src/modules/point/point.service";
import { UserService } from "src/modules/user/user.service";
import { Prompt } from "../../prompt/prompt.entity";
import { PromptService } from "../../prompt/prompt.service";
import { Drawing } from "../drawing.entity";
import { DrawingAccessService } from "./drawing-access.service";
import { DrawingRepository } from "../drawing.repository";
import { InjectRepository } from "@mikro-orm/nestjs";

type Similarity = ReturnType<typeof scoreFinalSimilarity>;
const SLOW_STROKES_DURATION_MS = 500;

function getStrokeMetrics(playerStrokes: Stroke[]) {
  const strokeCount = playerStrokes.length;
  const pointCount = playerStrokes.reduce((total, stroke) => {
    const [xs, ys] = stroke.points;
    return total + Math.max(xs.length, ys.length);
  }, 0);

  return { strokeCount, pointCount };
}

function getFailureLogLevel(error: unknown): "warn" | "error" {
  if (error instanceof HttpException && error.getStatus() < 500) return "warn";
  return "error";
}

@Injectable()
export class DrawingService {
  private readonly logger = new Logger(DrawingService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly userService: UserService,
    private readonly promptService: PromptService,
    private readonly pointService: PointService,
    private readonly drawingAccessService: DrawingAccessService,
    @InjectRepository(Drawing)
    private readonly drawingRepository: DrawingRepository,
  ) {}

  // 획 단위 실시간 호출 엔드포인트. 클라 값 신뢰 X → 서버가 매번 유사도 재계산
  async scoreStrokes(playerStrokes: Stroke[], date: Date): Promise<Similarity> {
    const startedAt = Date.now();
    const strokeMetrics = getStrokeMetrics(playerStrokes);
    let promptId: number | undefined;

    try {
      const prompt = await this.promptService.getPreprocessedByDate(date);
      promptId = prompt.promptId;
      const playerPreprocessed = preprocessStrokes(playerStrokes);
      const similarity = scoreFinalSimilarity(
        prompt.preprocessed,
        playerPreprocessed,
      );
      const durationMs = Date.now() - startedAt;
      const logObject = {
        event: "drawing.score.succeeded",
        promptId,
        score: similarity.score,
        durationMs,
        ...strokeMetrics,
      };

      if (durationMs >= SLOW_STROKES_DURATION_MS) {
        this.logger.warn(logObject, "실시간 유사도 계산 지연");
      } else {
        this.logger.debug(logObject, "실시간 유사도 계산 성공");
      }

      return similarity;
    } catch (err) {
      const logObject = {
        event: "drawing.score.failed",
        promptId,
        durationMs: Date.now() - startedAt,
        ...strokeMetrics,
        err,
      };

      if (getFailureLogLevel(err) === "warn") {
        this.logger.warn(logObject, "실시간 유사도 계산 실패");
      } else {
        this.logger.error(logObject, "실시간 유사도 계산 실패");
      }

      throw err;
    }
  }

  // 최종 제출. 유사도를 다시 계산해 저장 (클라가 보낸 similarity는 사용하지 않음)
  async submitDrawing(
    userKey: number,
    playerStrokes: Stroke[],
    date: Date,
  ): Promise<{
    drawingId: number;
    similarity: Similarity;
    promotionGranted: boolean;
  }> {
    const startedAt = Date.now();
    const strokeMetrics = getStrokeMetrics(playerStrokes);
    const user = await this.userService.getUserInfo(userKey);
    await this.drawingAccessService.validateAccess(user);

    const { promptId, preprocessed } =
      await this.promptService.getPreprocessedByDate(date);
    const playerPreprocessed = preprocessStrokes(playerStrokes);
    const similarity = scoreFinalSimilarity(preprocessed, playerPreprocessed);

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

    this.logger.log(
      {
        event: "drawing.submit.succeeded",
        userKey,
        drawingId: Number(drawing.id),
        promptId,
        score: similarity.score,
        durationMs: Date.now() - startedAt,
        ...strokeMetrics,
      },
      "최종 드로잉 제출 성공",
    );

    const promotionGranted =
      await this.pointService.grantDrawingPromotionIfEligible(user.userKey);

    return { drawingId: Number(drawing.id), similarity, promotionGranted };
  }

  async getMyDrawings(userKey: number) {
    const myDrawings = await this.drawingRepository.findTodayByUser(userKey);

    if (myDrawings.length === 0) {
      return { userKey, drawings: [] };
    }

    const myRankedDrawings =
      await this.drawingRepository.findMyDrawingsWithRank(userKey);
    const drawings = myRankedDrawings.map((d) => ({
      drawingId: Number(d.id),
      drawingRanking: d.rank,
      strokes: d.strokes,
      similarity: d.similarity,
      nickname: d.nickname,
    }));

    return { userKey, drawings };
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
      nickname: drawing.user.nickname,
      drawRanking,
      strokes: JSON.parse(drawing.strokes) as Stroke[],
      similarity: JSON.parse(drawing.similarity) as SimilarityResponse,
    };
  }
}
