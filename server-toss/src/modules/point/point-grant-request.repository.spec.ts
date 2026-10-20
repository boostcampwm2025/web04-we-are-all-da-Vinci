import { describe, expect, it, jest } from "@jest/globals";
import { PointGrantRequestRepository } from "./point-grant-request.repository";
import {
  PointGrantRequest,
  PointGrantStatus,
} from "./entity/point-grant-request.entity";

const FIXED_NOW = new Date("2026-05-25T00:00:00.000Z");

jest.mock("src/common/util/time.util", () => ({
  getSeoulDateTime: () => FIXED_NOW,
}));

jest.mock("@mikro-orm/mysql", () => ({
  EntityRepository: class {},
  LockMode: { PESSIMISTIC_PARTIAL_WRITE: "pessimistic_partial_write" },
}));

describe("포인트 지급 요청 저장소", () => {
  const setup = () => {
    // 생성자를 실행해야 lease timeout 등 필드 초기화도 실제 코드대로 수행된다.
    const repository = new PointGrantRequestRepository(
      {} as never,
      PointGrantRequest,
    );
    const find = jest
      .fn<(where: unknown, options?: unknown) => Promise<PointGrantRequest[]>>()
      .mockResolvedValue([]);
    Object.assign(repository, { find });
    return { repository, find };
  };

  it("격리 및 최종 실패 요청은 제외하고 PROCESSING, RETRY, PENDING만 조회한다", async () => {
    const { repository, find } = setup();

    await repository.findEligibleGrantsWithLock();

    // SUSPENDED는 운영자가 명시적으로 RETRY로 변경한 뒤에만 이 조회 대상이 된다.
    const statuses = find.mock.calls.flatMap(([where]) =>
      (where as { $and: Array<{ status?: PointGrantStatus }> }).$and.flatMap(
        ({ status }) => (status ? [status] : []),
      ),
    );
    expect(statuses).toEqual([
      PointGrantStatus.PROCESSING,
      PointGrantStatus.RETRY,
      PointGrantStatus.PENDING,
    ]);
  });

  it("15분 전에 선점된 PROCESSING과 재시도 시각이 된 RETRY를 복구 대상으로 조회한다", async () => {
    const { repository, find } = setup();

    await repository.findEligibleGrantsWithLock();

    expect(find).toHaveBeenCalledWith(
      {
        $and: [
          { status: PointGrantStatus.PROCESSING },
          { lockedAt: { $lte: new Date(FIXED_NOW.getTime() - 15 * 60_000) } },
        ],
      },
      expect.objectContaining({ lockMode: "pessimistic_partial_write" }),
    );
    expect(find).toHaveBeenCalledWith(
      {
        $and: [
          { status: PointGrantStatus.RETRY },
          { nextRetryAt: { $lte: FIXED_NOW } },
        ],
      },
      expect.anything(),
    );
  });

  it("만료된 선점 요청으로 배치가 차면 신규 요청을 추가 조회하지 않는다", async () => {
    const { repository, find } = setup();
    const stale = Object.assign(new PointGrantRequest(), { id: 1n });
    find.mockResolvedValueOnce([stale]);

    const result = await repository.findEligibleGrantsWithLock(1);

    expect(result).toEqual([stale]);
    expect(find).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 1 }),
    );
  });
});
