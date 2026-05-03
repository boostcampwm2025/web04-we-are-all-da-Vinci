import { EntityManager } from "@mikro-orm/core";
import { Injectable } from "@nestjs/common";
import { getSeoulDayRange } from "src/common/time.util";
import { User } from "src/modules/user/user.entity";
import { PointLog, PointReason } from "./point-log.entity";

@Injectable()
export class PointService {
  constructor(private readonly em: EntityManager) {}

  async canGrantTodayPromotion(userId: bigint): Promise<boolean> {
    const { start, end } = getSeoulDayRange();
    const count = await this.em.count(PointLog, {
      user: userId,
      reason: PointReason.DRAWING,
      createdAt: { $gte: start, $lt: end },
    });
    return count < 2;
  }

  async saveDrawingPointLog(userId: bigint): Promise<void> {
    const userRef = this.em.getReference(User, userId);
    const log = new PointLog();
    log.user = userRef;
    log.reason = PointReason.DRAWING;
    log.pointAmount = 2;
    this.em.persist(log);
    await this.em.flush();
  }
}
