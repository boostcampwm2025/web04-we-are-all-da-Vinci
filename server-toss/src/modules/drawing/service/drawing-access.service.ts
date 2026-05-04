import { EntityManager } from "@mikro-orm/mysql";
import { BadRequestException, Injectable } from "@nestjs/common";
import { getSeoulDayRange } from "src/common/time.util";
import { AdType, AdView } from "src/modules/ad/ad-view.entity";
import { User } from "src/modules/user/user.entity";
import { Drawing } from "../drawing.entity";

@Injectable()
export class DrawingAccessService {
  private readonly DEFAULT_DRAWING_COUNT = 1;

  constructor(private readonly em: EntityManager) {}

  async canAccess(user: User): Promise<boolean> {
    const { start, end } = getSeoulDayRange();

    const drawingCount = await this.em.count(Drawing, {
      user,
      createdAt: {
        $gte: start,
        $lt: end,
      },
    });

    const adViewCount = await this.em.count(AdView, {
      user,
      type: AdType.DRAWING,
      createdAt: {
        $gte: start,
        $lt: end,
      },
    });

    return drawingCount < this.DEFAULT_DRAWING_COUNT + adViewCount;
  }

  async validateAccess(user: User): Promise<void> {
    if (!(await this.canAccess(user))) {
      throw new BadRequestException("NO_DRAWING_CHANCE");
    }
  }
}
