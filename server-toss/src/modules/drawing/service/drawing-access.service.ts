import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { User } from "src/modules/user/user.entity";
import { ChanceService } from "src/modules/chance/chance.service";

@Injectable()
export class DrawingAccessService {
  private readonly logger = new Logger(DrawingAccessService.name);

  constructor(private readonly chanceService: ChanceService) {}

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
          chanceCount: accessStatus.chanceCount,
        },
        "그림 제출 기회 부족",
      );
      throw new BadRequestException("NO_DRAWING_CHANCE");
    }
  }

  private async getAccessStatus(user: User) {
    const { count } = await this.chanceService.getMyChance(user.userKey);
    const allowed = count > 0;

    return { allowed, chanceCount: count };
  }
}
