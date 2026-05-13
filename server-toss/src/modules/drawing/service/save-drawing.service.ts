import { RankingService } from "src/modules/ranking/ranking.service";
import { User } from "src/modules/user/user.entity";
import { Drawing } from "../drawing.entity";
import { SaveDrawingDto } from "../dto/save-drawing.dto";
import { Injectable } from "@nestjs/common";
import { DrawingRepository } from "../drawing.repository";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Transactional } from "@mikro-orm/decorators/legacy";

@Injectable()
export class SaveDrawingService {
  constructor(
    @InjectRepository(Drawing)
    private readonly drawingRepository: DrawingRepository,
    private readonly rankingService: RankingService,
  ) {}

  @Transactional()
  async saveDrawingWithRanking(
    user: User,
    dto: SaveDrawingDto,
  ): Promise<Drawing> {
    const { promptId, strokes, similarity } = dto;

    const drawing = await this.drawingRepository.saveDrawing(
      user,
      promptId,
      JSON.stringify(strokes),
      JSON.stringify(similarity),
      similarity.score,
    );

    await this.rankingService.updateRanking(user, drawing);

    return drawing;
  }
}
