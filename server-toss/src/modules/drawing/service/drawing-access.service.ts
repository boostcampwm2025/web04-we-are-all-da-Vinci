import { EntityManager } from "@mikro-orm/mysql";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { User } from "src/modules/user/user.entity";
import { Drawing } from "../drawing.entity";
import { getSeoulDayRange } from "src/common/util/time.util";
import { AdType, AdView } from "src/modules/ad/ad-view.entity";

@Injectable()
export class DrawingAccessService {
  private readonly logger = new Logger(DrawingAccessService.name);
  private readonly DEFAULT_DRAWING_COUNT = 1;

  constructor(private readonly em: EntityManager) {}

  async canAccess(user: User) {
    return (await this.getAccessStatus(user)).allowed;
  }

  async validateAccess(user: User): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      this.logger.debug(
        { event: "drawing.access.bypass_dev", userKey: user.userKey },
        "개발환경 그림 제출 기회 검증 우회",
      );
      return;
    }

    const accessStatus = await this.getAccessStatus(user);
    if (!accessStatus.allowed) {
      this.logger.warn(
        {
          event: "drawing.access.denied",
          userKey: user.userKey,
          drawingCount: accessStatus.drawingCount,
          adViewCount: accessStatus.adViewCount,
        },
        "그림 제출 기회 부족",
      );
      throw new BadRequestException("NO_DRAWING_CHANCE");
    }
  }

  private async getAccessStatus(user: User) {
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
    const allowed = drawingCount < this.DEFAULT_DRAWING_COUNT + adViewCount;

    return { allowed, drawingCount, adViewCount };
  }
}
