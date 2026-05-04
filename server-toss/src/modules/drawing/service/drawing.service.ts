import { preprocessStrokes, scoreFinalSimilarity } from "@davinci/similarity";
import { EntityManager, QueryOrder } from "@mikro-orm/mysql";

import { HttpException, Injectable, Logger } from "@nestjs/common";
import { Prompt } from "../../prompt/prompt.entity";
import { PromptService } from "../../prompt/prompt.service";
import { Drawing } from "../drawing.entity";
import { DrawingAccessService } from "./drawing-access.service";
import { UserService } from "src/modules/user/user.service";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { getSeoulDayRange } from "src/common/utils/time.util";

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
    private readonly drawingAccessService: DrawingAccessService,
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
  ): Promise<{ drawingId: number; similarity: Similarity }> {
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

    return { drawingId: Number(drawing.id), similarity };
  }

  private async findTodayByUser(userKey: number): Promise<Drawing[]> {
    const { start, end } = getSeoulDayRange();
    return this.em.find(
      Drawing,
      { user: { userKey: userKey }, createdAt: { $gte: start, $lt: end } },
      {
        populate: ["user", "prompt"],
        orderBy: [{ score: QueryOrder.DESC }],
      },
    );
  }

  async getMyDrawings(userKey: number) {
    const { start, end } = getSeoulDayRange();
    const myDrawings = await this.findTodayByUser(userKey);

    if (myDrawings.length === 0) {
      return { userKey, drawings: [] };
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
      name: drawing.user.name,
      drawRanking,
      strokes: JSON.parse(drawing.strokes) as Stroke[],
      similarity: JSON.parse(drawing.similarity) as SimilarityResponse,
    };
  }
}
