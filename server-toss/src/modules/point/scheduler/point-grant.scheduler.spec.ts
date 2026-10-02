import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { EntityManager } from "@mikro-orm/mysql";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import { Test, TestingModule } from "@nestjs/testing";
import { PointService } from "../point.service";
import { PointGrantScheduler } from "./point-grant.scheduler";

const createPointService = () => ({
  recoverSuspended: jest
    .fn<PointService["recoverSuspended"]>()
    .mockResolvedValue(undefined),
  settleGrantRequests: jest
    .fn<PointService["settleGrantRequests"]>()
    .mockResolvedValue(false),
});

describe("포인트 지급 스케줄러", () => {
  let module: TestingModule | undefined;
  let expectedBootstrapError: Error | undefined;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2026-10-02T00:00:00.000Z") });
    module = undefined;
    expectedBootstrapError = undefined;
  });

  const setup = async (pointService: ReturnType<typeof createPointService>) => {
    module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        PointGrantScheduler,
        { provide: EntityManager, useValue: {} },
        { provide: PointService, useValue: pointService },
      ],
    }).compile();
    return module;
  };

  afterEach(async () => {
    try {
      // bootstrap 실패 시 close()가 종료 훅 전에 예외를 던지므로 cron을 직접 정리한다.
      const registry = module?.get(SchedulerRegistry);
      if (registry) {
        for (const name of registry.getCronJobs().keys()) {
          registry.deleteCronJob(name);
        }
      }
      await module?.close();
    } catch (err) {
      if (
        expectedBootstrapError === undefined ||
        err !== expectedBootstrapError
      ) {
        throw err;
      }
    } finally {
      jest.useRealTimers();
    }
  });

  it("서버 시작 시 복구를 호출하고 다음 cron에서 지급 배치를 실행한다", async () => {
    const pointService = createPointService();
    const app = await setup(pointService);

    expect(pointService.recoverSuspended).not.toHaveBeenCalled();
    await app.init();

    expect(pointService.recoverSuspended).toHaveBeenCalledTimes(1);
    expect(pointService.settleGrantRequests).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1_000);
    expect(pointService.settleGrantRequests).toHaveBeenCalledTimes(1);
  });

  it("서버 시작 시 복구 호출이 완료되기 전에는 지급 cron을 실행하지 않는다", async () => {
    const pointService = createPointService();
    let completeRecovery!: () => void;
    pointService.recoverSuspended.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completeRecovery = resolve;
        }),
    );
    const app = await setup(pointService);
    const initialization = app.init();

    try {
      // 실제 Nest 시작 훅과 cron을 사용해 복구 대기 중 실행을 검증한다.
      await jest.advanceTimersByTimeAsync(2_000);
      expect(pointService.recoverSuspended).toHaveBeenCalledTimes(1);
      expect(pointService.settleGrantRequests).not.toHaveBeenCalled();

      completeRecovery();
      await initialization;
      expect(pointService.settleGrantRequests).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1_000);
      expect(pointService.settleGrantRequests).toHaveBeenCalledTimes(1);
    } finally {
      completeRecovery();
      await initialization;
    }
  });

  it("서버 시작 시 복구에 실패하면 bootstrap이 실패하고 이후 cron에서도 지급 배치를 실행하지 않는다", async () => {
    const pointService = createPointService();
    const recoveryError = new Error("SUSPENDED 요청 복구 실패");
    expectedBootstrapError = recoveryError;
    pointService.recoverSuspended.mockRejectedValueOnce(recoveryError);
    const app = await setup(pointService);

    const [initialization] = await Promise.allSettled([app.init()]);
    await jest.advanceTimersByTimeAsync(2_000);

    expect(initialization.status).toBe("rejected");
    if (initialization.status === "rejected") {
      expect(initialization.reason).toBe(recoveryError);
    }
    expect(pointService.settleGrantRequests).not.toHaveBeenCalled();
  });

  it("SUSPENDED 요청이 반환되면 이후 cron에서 지급 배치를 다시 호출하지 않는다", async () => {
    const pointService = createPointService();
    pointService.settleGrantRequests.mockResolvedValueOnce(true);
    const app = await setup(pointService);
    await app.init();

    await jest.advanceTimersByTimeAsync(1_000);
    expect(pointService.settleGrantRequests).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(2_000);
    expect(pointService.settleGrantRequests).toHaveBeenCalledTimes(1);
  });

  it("서버를 재시작하면 새 스케줄러가 복구를 다시 호출하고 지급 배치를 실행한다", async () => {
    const firstService = createPointService();
    firstService.settleGrantRequests.mockResolvedValueOnce(true);
    const firstApp = await setup(firstService);
    await firstApp.init();
    await jest.advanceTimersByTimeAsync(1_000);
    expect(firstService.settleGrantRequests).toHaveBeenCalledTimes(1);
    await firstApp.close();

    const restartedService = createPointService();
    const restartedApp = await setup(restartedService);
    await restartedApp.init();

    expect(restartedService.recoverSuspended).toHaveBeenCalledTimes(1);
    expect(restartedService.settleGrantRequests).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1_000);
    expect(restartedService.settleGrantRequests).toHaveBeenCalledTimes(1);
    expect(firstService.settleGrantRequests).toHaveBeenCalledTimes(1);
  });
});
