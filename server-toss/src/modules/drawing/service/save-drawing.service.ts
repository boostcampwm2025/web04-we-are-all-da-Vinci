import { RankingService } from "src/modules/ranking/ranking.service";
import { User } from "src/modules/user/user.entity";
import { Drawing } from "../drawing.entity";
import { SaveDrawingDto } from "../dto/save-drawing.dto";
import { Injectable } from "@nestjs/common";
import { DrawingRepository } from "../drawing.repository";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Transactional } from "@mikro-orm/decorators/legacy";
import { PointService } from "src/modules/point/point.service";
import { PointReason } from "src/modules/point/point-log.entity";

@Injectable()
export class SaveDrawingService {
  constructor(
    @InjectRepository(Drawing)
    private readonly drawingRepository: DrawingRepository,
    private readonly rankingService: RankingService,
    private readonly pointService: PointService,
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

    // 프로모션 지급 가능 여부 판단
    const promotionGranted = await this.pointService.canGrantTodayPromotion(
      user.userKey,
    );
    if (promotionGranted) {
      // 프로모션 지급 로그 저장
      await this.pointService.savePointGrantRequest(user, PointReason.DRAWING);
    }

    return { drawing, promotionGranted };
  }
}
