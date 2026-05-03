import { EntityManager } from "@mikro-orm/mysql";
import { BadRequestException, Injectable } from "@nestjs/common";
import { User } from "src/modules/user/user.entity";
import { Drawing } from "../drawing.entity";
import { getSeoulDayRange } from "src/common/time.util";
import { AdType, AdView } from "src/modules/ad/ad-view.entity";

@Injectable()
export class DrawingAccessService {
  private readonly MAX_DRAWING_COUNT = 10;
  private readonly DEFAULT_DRAWING_COUNT = 1;
  constructor(private readonly em: EntityManager) {}

  async canAccess(user: User) {
    const { start, end } = getSeoulDayRange();
    // TODO: 그림 제출 횟수 < 기본 1회 + 광고 조회 횟수 + 공유 횟수 등등
    const drawingCount = await this.em.count(Drawing, {
      user: user,
      createdAt: {
        $gte: start,
        $lt: end,
      },
    });

    const adViewCount = await this.em.count(AdView, {
      user: user,
      type: AdType.DRAWING,
      createdAt: {
        $gte: start,
        $lt: end,
      },
    });

    return (
      drawingCount < this.MAX_DRAWING_COUNT &&
      drawingCount < this.DEFAULT_DRAWING_COUNT + adViewCount
    );
  }

  async validateAccess(user: User) {
    // 기회는 프론트 네이티브 스토리지에서 관리
    // 이후 최대 그리기 횟수가 지정되면 변경
    return true;
    if (!(await this.canAccess(user))) {
      throw new BadRequestException("그림 제출 기회가 없습니다.");
    }
  }
}
