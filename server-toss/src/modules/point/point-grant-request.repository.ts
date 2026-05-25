import { QueryOrder } from "@mikro-orm/core";
import { EntityRepository, LockMode } from "@mikro-orm/mysql";
import {
  PointGrantRequest,
  PointGrantStatus,
} from "./point-grant-request.entity";
import { getSeoulDateTime } from "src/common/util/time.util";

export class PointGrantRequestRepository extends EntityRepository<PointGrantRequest> {
  async purgeByStatusBefore(
    status: PointGrantStatus,
    cutoff: Date,
    batchSize: number,
  ): Promise<number> {
    const targets = await this.find(
      {
        status,
        processedAt: { $lt: cutoff },
      },
      {
        fields: ["id"],
        orderBy: { processedAt: QueryOrder.ASC },
        limit: batchSize,
        disableIdentityMap: true,
      },
    );

    const ids = targets.map((target) => target.id);
    if (ids.length === 0) return 0;

    return this.nativeDelete({ id: { $in: ids } });
  }

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
