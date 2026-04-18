import { InjectRepository } from "@mikro-orm/nestjs";
import { Drawing } from "./drawing.entity";
import { EntityManager, sql } from "@mikro-orm/mysql";
import { DrawingRepository } from "./drawing.repository";

export class DrawingService {
  constructor(
    @InjectRepository(Drawing)
    private readonly drawingRepository: DrawingRepository,
    private readonly em: EntityManager,
  ) {}

  async getTodayDrawings(userId: string) {
    type DrawingRow = Drawing & { drawRanking: number };

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const rankSubquery = sql`(
      SELECT COUNT(*) + 1
      FROM drawings d2
      WHERE d2.prompt_id = d.prompt_id
        AND d2.created_at >= ${today}
        AND JSON_EXTRACT(d2.similarity, '$.score') > JSON_EXTRACT(d.similarity, '$.score')
    )`;

    const rows: DrawingRow[] = await this.em
      .createQueryBuilder(Drawing, "d")
      .select(["d.*", rankSubquery.as("drawRanking")])
      .where({ user: userId, createdAt: { $gte: today } })
      .execute();

    const drawings = rows.map((row) => ({
      drawingId: row.id,
      drawRanking: Number(row.drawRanking),
      strokes: row.strokes,
      similarity: row.similarity,
    }));

    return { userId, drawings };
  }
}
