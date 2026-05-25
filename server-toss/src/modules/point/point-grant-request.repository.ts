import { EntityRepository, LockMode } from "@mikro-orm/mysql";
import {
  PointGrantRequest,
  PointGrantStatus,
} from "./point-grant-request.entity";
import { getSeoulDateTime } from "src/common/util/time.util";

export class PointGrantRequestRepository extends EntityRepository<PointGrantRequest> {
  async findEligibleGrantsWithLock(): Promise<PointGrantRequest[]> {
    const now = getSeoulDateTime();
    const qb = this.em.createQueryBuilder(PointGrantRequest, "pgr");
    const requests = await qb
      .where({ status: PointGrantStatus.PENDING })
      .orWhere({
        $and: [
          { status: PointGrantStatus.RETRY },
          { nextRetryAt: { $lte: now } },
        ],
      })
      .setLockMode(LockMode.PESSIMISTIC_WRITE)
      .limit(20)
      .getResultList();

    return requests;
  }
}
