import {
  RankingService,
  type RankingChangeResult,
} from "src/modules/ranking/ranking.service";
import { User } from "src/modules/user/user.entity";
import { Drawing } from "../drawing.entity";
import { SaveDrawingDto } from "../dto/save-drawing.dto";
import { Injectable } from "@nestjs/common";
import { DrawingRepository } from "../drawing.repository";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Transactional } from "@mikro-orm/decorators/legacy";
import { MissionService } from "src/modules/mission/service/mission.service";

export type SaveDrawingResult = {
  drawing: Drawing;
  rankingChange: RankingChangeResult;
};

@Injectable()
export class SaveDrawingService {
  constructor(
    @InjectRepository(Drawing)
    private readonly drawingRepository: DrawingRepository,
    private readonly rankingService: RankingService,
    private readonly missionService: MissionService,
  ) {}

  @Transactional()
  async saveDrawingWithRanking(
    user: User,
    dto: SaveDrawingDto,
  ): Promise<SaveDrawingResult> {
    const { promptId, strokes, similarity } = dto;

    const drawing = await this.drawingRepository.saveDrawing(
      user,
      promptId,
      JSON.stringify(strokes),
      JSON.stringify(similarity),
      similarity.score,
    );

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
