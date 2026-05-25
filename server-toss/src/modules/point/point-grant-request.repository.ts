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

  async findEligibleGrantsWithLock(
    batchSize: number = 20,
  ): Promise<PointGrantRequest[]> {
    const now = getSeoulDateTime();
    const retryRequests = await this.find(
      {
        $and: [
          { status: PointGrantStatus.RETRY },
          { nextRetryAt: { $lte: now } },
        ],
      },
      {
        limit: batchSize,
        orderBy: { nextRetryAt: "ASC" },
        lockMode: LockMode.PESSIMISTIC_PARTIAL_WRITE,
      },
    );

    if (batchSize <= retryRequests.length) {
      return retryRequests;
    }

    const pendingRequests = await this.find(
      {
        $and: [
          { status: PointGrantStatus.PENDING },
          { createdAt: { $lte: now } },
        ],
      },
      {
        orderBy: { createdAt: "ASC" },
        limit: batchSize - retryRequests.length,
        lockMode: LockMode.PESSIMISTIC_PARTIAL_WRITE,
      },
    );

    return [...retryRequests, ...pendingRequests];
  }
}
