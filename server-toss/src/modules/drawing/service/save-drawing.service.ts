import { RankingService } from "src/modules/ranking/ranking.service";
import { User } from "src/modules/user/user.entity";
import { Drawing } from "../drawing.entity";
import { SaveDrawingDto } from "../dto/save-drawing.dto";
import { Injectable } from "@nestjs/common";
import { DrawingRepository } from "../drawing.repository";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Transactional } from "@mikro-orm/decorators/legacy";
import { PointService } from "src/modules/point/point.service";
import { PointReason } from "src/modules/point/entity/point-log.entity";
import { QuestService } from "src/modules/quest/quest.service";

@Injectable()
export class SaveDrawingService {
  constructor(
    @InjectRepository(Drawing)
    private readonly drawingRepository: DrawingRepository,
    private readonly rankingService: RankingService,
    private readonly pointService: PointService,
    private readonly questService: QuestService,
  ) {}

  @Transactional()
  async saveDrawingWithRanking(
    user: User,
    dto: SaveDrawingDto,
  ): Promise<{ drawing: Drawing; promotionGranted: boolean }> {
    const { promptId, strokes, similarity } = dto;

    const drawing = await this.drawingRepository.saveDrawing(
      user,
      promptId,
      JSON.stringify(strokes),
      JSON.stringify(similarity),
      similarity.score,
    );

    await this.rankingService.updateRanking(user, drawing);

    const promotionGranted = await this.pointService.savePointGrantRequest(
      user.userKey,
      PointReason.DRAWING,
    );

    await this.questService.onDrawingSubmitted(user.userKey, {
      drawingId: drawing.id,
      score: similarity.score,
      penalty: similarity.penalty,
    });

    return { drawing, promotionGranted };
  }
}
