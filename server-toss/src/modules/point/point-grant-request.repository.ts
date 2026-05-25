import { EntityRepository, LockMode, sql } from "@mikro-orm/mysql";
import {
  PointGrantRequest,
  PointGrantStatus,
} from "./point-grant-request.entity";

export class PointGrantRequestRepository extends EntityRepository<PointGrantRequest> {
  async findEligibleGrantsWithLock(): Promise<PointGrantRequest[]> {
    const qb = this.em.createQueryBuilder(PointGrantRequest, "pgr");
    const requests = await qb
      .where({ status: PointGrantStatus.PENDING })
      .orWhere({
        $and: [
          { status: PointGrantStatus.RETRY },
          { attemptCount: { $lt: sql`pgr.maxAttemptCount` } },
        ],
      })
      .setLockMode(LockMode.PESSIMISTIC_WRITE)
      .limit(100)
      .getResultList();

    return requests;
  }
}
