import { EntityRepository, LockMode } from "@mikro-orm/mysql";
import {
  PointGrantRequest,
  PointGrantStatus,
} from "./entity/point-grant-request.entity";
import { getSeoulDateTime } from "src/common/util/time.util";

export class PointGrantRequestRepository extends EntityRepository<PointGrantRequest> {
  // 20건 순차 처리 × 최대 4회 API × 전체 timeout 10초(800초)에 여유를 둔다.
  private readonly LEASE_TIMEOUT: number = 15 * 60 * 1000;

  async findEligibleGrantsWithLock(
    batchSize: number = 20,
  ): Promise<PointGrantRequest[]> {
    const now = getSeoulDateTime();

    const staleRequests = await this.find(
      {
        $and: [
          { status: PointGrantStatus.PROCESSING },
          { lockedAt: { $lte: new Date(now.getTime() - this.LEASE_TIMEOUT) } },
        ],
      },
      {
        limit: batchSize,
        orderBy: { lockedAt: "ASC" },
        lockMode: LockMode.PESSIMISTIC_PARTIAL_WRITE,
      },
    );

    if (batchSize <= staleRequests.length) {
      return staleRequests;
    }

    const retryRequests = await this.find(
      {
        $and: [
          { status: PointGrantStatus.RETRY },
          { nextRetryAt: { $lte: now } },
        ],
      },
      {
        limit: batchSize - staleRequests.length,
        orderBy: { nextRetryAt: "ASC" },
        lockMode: LockMode.PESSIMISTIC_PARTIAL_WRITE,
      },
    );

    if (batchSize <= retryRequests.length + staleRequests.length) {
      return [...staleRequests, ...retryRequests];
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
        limit: batchSize - (staleRequests.length + retryRequests.length),
        lockMode: LockMode.PESSIMISTIC_PARTIAL_WRITE,
      },
    );

    return [...staleRequests, ...retryRequests, ...pendingRequests];
  }

  async existSuspendedRequests() {
    return (
      (await this.count({
        status: PointGrantStatus.SUSPENDED,
      })) > 0
    );
  }

  async updateSuspendedToPending() {
    return await this.nativeUpdate(
      { status: PointGrantStatus.SUSPENDED },
      { status: PointGrantStatus.PENDING, lockedAt: null },
    );
  }
}
