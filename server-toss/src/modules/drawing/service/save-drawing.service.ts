import { EntityManager } from "@mikro-orm/mysql";
import { Injectable } from "@nestjs/common";
import { Transactional } from "@mikro-orm/decorators/legacy";
import {
  RankingService,
  type RankingChangeResult,
} from "src/modules/ranking/ranking.service";
import { MissionService } from "src/modules/mission/service/mission.service";
import { User } from "src/modules/user/user.entity";
import { Prompt } from "src/modules/prompt/prompt.entity";
import { Drawing } from "../drawing.entity";
import { SaveDrawingDto } from "../dto/save-drawing.dto";

export type SaveDrawingResult = {
  drawing: Drawing;
  rankingChange: RankingChangeResult;
};

@Injectable()
export class SaveDrawingService {
  constructor(
    private readonly em: EntityManager,
    private readonly rankingService: RankingService,
    private readonly missionService: MissionService,
  ) {}

  @Transactional()
  async saveDrawingWithRanking(
    user: User,
    dto: SaveDrawingDto,
  ): Promise<SaveDrawingResult> {
    const { promptId, strokes, similarity } = dto;

    const drawing = this.em.create(Drawing, {
      user,
      prompt: this.em.getReference(Prompt, BigInt(promptId)),
      strokes: JSON.stringify(strokes),
      similarity: JSON.stringify(similarity),
      score: similarity.score,
    });

    this.em.persist(drawing);
    await this.em.flush();

    const rankingChange = await this.rankingService.updateRanking(
      user,
      drawing,
    );

    await this.missionService.onDrawingSubmitted(user.userKey, {
      drawingId: drawing.id,
      score: similarity.score,
      penalty: similarity.penalty,
    });

    return { drawing, rankingChange };
  }
}
