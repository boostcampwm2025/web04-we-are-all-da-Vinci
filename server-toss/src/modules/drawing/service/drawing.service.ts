import { preprocessStrokes, scoreFinalSimilarity } from "@davinci/similarity";
import { EntityManager } from "@mikro-orm/core";
import { Injectable } from "@nestjs/common";
import type { Stroke } from "@toss/shared";
import { Prompt } from "../../prompt/prompt.entity";
import { PromptService } from "../../prompt/prompt.service";
import { Drawing } from "../drawing.entity";
import { DrawingAccessService } from "./drawing-access.service";
import { UserService } from "src/modules/user/user.service";

type Similarity = ReturnType<typeof scoreFinalSimilarity>;

@Injectable()
export class DrawingService {
  constructor(
    private readonly em: EntityManager,
    private readonly userService: UserService,
    private readonly promptService: PromptService,
    private readonly drawingAccessService: DrawingAccessService,
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
    const user = await this.userService.findUser(userKey);
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

    // MikroORM v7: persist로 UoW 등록 후 flush로 일괄 커밋
    this.em.persist(drawing);
    await this.em.flush();

    return { drawingId: Number(drawing.id), similarity };
  }
}
