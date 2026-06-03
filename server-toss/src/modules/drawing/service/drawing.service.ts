import { preprocessStrokes, scoreFinalSimilarity } from "@davinci/similarity";
import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { formatKstDate } from "src/common/util/time.util";
import { PointService } from "src/modules/point/point.service";
import {
  RankingChangedEvent,
  RANKING_CHANGED_EVENT,
} from "src/modules/ranking/events/ranking-changed.event";
import { UserService } from "src/modules/user/user.service";
import { PromptService } from "../../prompt/prompt.service";
import { Drawing } from "../drawing.entity";
import { DrawingRepository } from "../drawing.repository";
import { InjectRepository } from "@mikro-orm/nestjs";
import { SaveDrawingService } from "./save-drawing.service";
import { SaveDrawingDto } from "../dto/save-drawing.dto";

type Similarity = ReturnType<typeof scoreFinalSimilarity>;
const SLOW_STROKES_DURATION_MS = 500;

function getFailureLogLevel(error: unknown): "warn" | "error" {
  if (error instanceof HttpException && error.getStatus() < 500) return "warn";
  return "error";
}

@Injectable()
export class DrawingService {
  private readonly logger = new Logger(DrawingService.name);

  constructor(
    private readonly userService: UserService,
    private readonly promptService: PromptService,
    private readonly pointService: PointService,
    @InjectRepository(Drawing)
    private readonly drawingRepository: DrawingRepository,
    private readonly saveDrawingService: SaveDrawingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // 획 단위 실시간 호출 엔드포인트. 클라 값 신뢰 X → 서버가 매번 유사도 재계산
  async scoreStrokes(playerStrokes: Stroke[], date: Date): Promise<Similarity> {
    const startedAt = Date.now();
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
      };

      if (durationMs >= SLOW_STROKES_DURATION_MS) {
        this.logger.warn(logObject, "실시간 유사도 계산 지연");
      } else {
        this.logger.debug(logObject, "실시간 유사도 계산 성공");
      }

      return similarity;
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const logObject = {
        event: "drawing.score.failed",
        promptId,
        durationMs,
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
    const user = await this.userService.getUserInfo(userKey);

    const { promptId, preprocessed } =
      await this.promptService.getPreprocessedByDate(date);

    const playerPreprocessed = preprocessStrokes(playerStrokes);
    const similarity = scoreFinalSimilarity(preprocessed, playerPreprocessed);

    const { drawing, rankingChange } =
      await this.saveDrawingService.saveDrawingWithRanking(
        user,
        new SaveDrawingDto(promptId, playerStrokes, similarity),
      );

    const promotionGranted =
      await this.pointService.grantDrawingPromotionIfEligible(user.userKey);

    this.logger.log(
      {
        event: "drawing.submit.succeeded",
        userKey,
        drawingId: Number(drawing.id),
        promptId,
        score: similarity.score,
        durationMs: Date.now() - startedAt,
      },
      "최종 드로잉 제출 성공",
    );

    // 트랜잭션 커밋 후(@Transactional이 saveDrawingWithRanking 종료 시 자동 commit)
    // emit한다. 핸들러는 비동기라 응답에 지연 추가 X.
    if (rankingChange.changed) {
      this.eventEmitter.emit(
        RANKING_CHANGED_EVENT,
        new RankingChangedEvent(
          user.userKey,
          drawing.id,
          rankingChange.newRank,
          rankingChange.overtakenUserKeys,
          formatKstDate(date),
        ),
      );
    }

    return { drawingId: Number(drawing.id), similarity, promotionGranted };
  }

  async getMyDrawings(userKey: number) {
    const myDrawings = await this.drawingRepository.findMyDrawings(userKey);

    const drawings = myDrawings.map((d) => ({
      drawingId: Number(d.id),
      strokes: JSON.parse(d.strokes) as Stroke[],
      similarity: JSON.parse(d.similarity) as SimilarityResponse,
    }));

    return { userKey, drawings };
  }

  async getDrawing(drawingId: bigint) {
    const drawing = await this.drawingRepository.findDrawingById(drawingId);

    if (!drawing) {
      this.logger.error(
        {
          event: "drawing.submit.not_found",
          drawingId,
        },
        "그림 기록이 존재하지 않음",
      );

      throw new NotFoundException("NOT_FOUND_DRAWING");
    }

    return {
      drawingId: Number(drawing.id),
      nickname: drawing.user.nickname,
      strokes: JSON.parse(drawing.strokes) as Stroke[],
      similarity: JSON.parse(drawing.similarity) as SimilarityResponse,
    };
  }
}
