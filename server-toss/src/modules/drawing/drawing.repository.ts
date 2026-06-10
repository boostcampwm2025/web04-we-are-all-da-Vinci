import { EntityRepository, QueryOrder } from "@mikro-orm/mysql";
import { Drawing } from "./drawing.entity";
import { getSeoulDateKey, getSeoulDayRange } from "src/common/util/time.util";
import { Prompt } from "../prompt/prompt.entity";
import { User } from "../user/user.entity";

export class DrawingRepository extends EntityRepository<Drawing> {
  async saveDrawing(
    user: User,
    promptId: number,
    strokes: string,
    similarity: string,
    score: number,
  ): Promise<Drawing> {
    const promptRef = this.em.getReference(Prompt, BigInt(promptId));
    const drawing = new Drawing();
    drawing.user = user;
    drawing.prompt = promptRef;
    drawing.strokes = strokes;
    drawing.similarity = similarity;
    drawing.score = score;

    this.em.persist(drawing);
    await this.em.flush();

    return drawing;
  }

  async findDrawingById(drawingId: bigint): Promise<Drawing | null> {
    return this.em.findOne(Drawing, { id: drawingId }, { populate: ["user"] });
  }

  async findMyDrawings(
    userKey: number,
  ): Promise<{ id: bigint; similarity: string; strokes: string }[]> {
    const { start, end } = getSeoulDayRange();

    return this.em.find(
      Drawing,
      {
        user: userKey,
        createdAt: { $gte: start, $lt: end },
      },

      {
        fields: ["id", "similarity", "strokes"],
        orderBy: [{ createdAt: QueryOrder.DESC }],
        disableIdentityMap: true,
      },
    );
  }

  // backfill 시 스냅샷을 만들어야 할 과거 날짜 목록
  async findPastSubmissionDates(reference = new Date()): Promise<string[]> {
    const { start } = getSeoulDayRange(reference);

    const drawings = await this.em.find(
      Drawing,
      { createdAt: { $lt: start } },
      {
        fields: ["createdAt"],
        orderBy: [{ createdAt: QueryOrder.ASC }],
        disableIdentityMap: true,
      },
    );

    return [
      ...new Set(drawings.map((drawing) => getSeoulDateKey(drawing.createdAt))),
    ];
  }

  async findArchivedDrawingsByUser(
    userKey: number,
  ): Promise<{ id: bigint; score: number; createdAt: Date }[]> {
    return this.em.find(
      Drawing,
      {
        user: userKey,
      },
      {
        fields: ["id", "score", "createdAt"],
        orderBy: [{ createdAt: QueryOrder.DESC }],
        disableIdentityMap: true,
      },
    );
  }

  // 특정 사용자의 특정 날짜 범위 drawing 목록
  async findUserDrawingsInRange(
    userKey: number,
    start: Date,
    end: Date,
  ): Promise<
    {
      id: bigint;
      strokes: string;
      similarity: string;
      score: number;
      createdAt: Date;
    }[]
  > {
    return this.em.find(
      Drawing,
      {
        user: userKey,
        createdAt: { $gte: start, $lt: end },
      },
      {
        fields: ["id", "strokes", "similarity", "score", "createdAt"],
        orderBy: [{ createdAt: QueryOrder.DESC }],
        disableIdentityMap: true,
      },
    );
  }

  async findDrawingsByCreatedAtRange(
    start: Date,
    end: Date,
  ): Promise<Drawing[]> {
    return this.em.find(
      Drawing,
      {
        createdAt: { $gte: start, $lt: end },
      },
      {
        populate: ["user"],
        orderBy: [
          { score: QueryOrder.DESC },
          { createdAt: QueryOrder.ASC },
          { id: QueryOrder.ASC },
        ],
      },
    );
  }
}
