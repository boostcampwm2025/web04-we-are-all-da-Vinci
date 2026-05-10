import { EntityRepository, QueryOrder } from "@mikro-orm/mysql";
import { Drawing } from "./drawing.entity";
import { getSeoulDayRange } from "src/common/util/time.util";
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
}
