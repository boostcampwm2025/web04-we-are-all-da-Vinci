import { Drawing } from "./drawing.entity";
import { EntityManager, QueryOrder } from "@mikro-orm/mysql";
import { getSeoulDayRange } from "src/common/time.util";
import { SimilarityResponse, Stroke } from "./types/drawing.type";

export class DrawingService {
  constructor(private readonly em: EntityManager) {}

  private async findTodayByUser(userId: string): Promise<Drawing[]> {
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

  async getMyDrawings(userId: string) {
    const { start, end } = getSeoulDayRange();
    const myDrawings = await this.findTodayByUser(userId);

    if (myDrawings.length === 0) {
      return { userId, drawings: [] };
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
        drawingId: drawing.id,
        drawRanking: rank,
        strokes: JSON.parse(drawing.strokes) as Stroke[],
        score: drawing.score,
        similarity: JSON.parse(drawing.similarity) as SimilarityResponse,
      };
    });

    return { userId, drawings };
  }

  async getBestDrawing(userId: string) {
    const drawings = await this.findTodayByUser(userId);
    const best = drawings[0];

    if (!best) {
      return null;
    }

    return {
      userId,
      name: best.user.name,
      strokes: JSON.parse(best.strokes) as Stroke[],
      score: best.score,
      similarity: JSON.parse(best.similarity) as SimilarityResponse,
    };
  }
}
