import type { ConfigService } from "@nestjs/config";
import { RankingChangedEvent } from "src/modules/ranking/events/ranking-changed.event";
import type { NotificationAgreementRepository } from "../notification-agreement.repository";
import { NOTIFICATION_TYPE } from "../notification.constants";
import type { NotificationService } from "../notification.service";
import { RankingChangedListener } from "./ranking-changed.listener";

const buildListener = (opts?: {
  enabled?: boolean;
  agreedUserKeys?: number[];
}) => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === "OVERTAKEN_NOTIFICATION_ENABLED") {
        return opts?.enabled === false ? "false" : "true";
      }
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === "TOSS_TEMPLATE_OVERTAKEN") return "overtaken_v1";
      throw new Error(`unexpected key: ${key}`);
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const notificationAgreementRepository = {
    findAgreedUserKeysAmong: jest
      .fn()
      .mockResolvedValue(opts?.agreedUserKeys ?? []),
  } as unknown as jest.Mocked<NotificationAgreementRepository>;

  const notificationService = {
    send: jest.fn().mockResolvedValue({ sent: true }),
  } as unknown as jest.Mocked<NotificationService>;

  const listener = new RankingChangedListener(
    {} as never,
    configService,
    notificationAgreementRepository,
    notificationService,
  );

  return {
    listener,
    configService,
    notificationAgreementRepository,
    notificationService,
  };
};

const buildEvent = (overtakenUserKeys: number[] = [101, 202]) =>
  new RankingChangedEvent(999, 12345n, 1, overtakenUserKeys, "2026-05-28");

describe("RankingChangedListener", () => {
  // handle()의 RequestContext.create 래핑은 공용 mock(setup-mikro-orm-mocks)이
  // 콜백 즉시 실행으로 대체한다.
  it("OVERTAKEN_NOTIFICATION_ENABLED가 true 아니면 발송 안 해요", async () => {
    const { listener, notificationAgreementRepository, notificationService } =
      buildListener({ enabled: false });

    await listener.handle(buildEvent());

    expect(
      notificationAgreementRepository.findAgreedUserKeysAmong,
    ).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("overtakenUserKeys가 비어 있으면 발송 안 해요", async () => {
    const { listener, notificationAgreementRepository, notificationService } =
      buildListener();

    await listener.handle(buildEvent([]));

    expect(
      notificationAgreementRepository.findAgreedUserKeysAmong,
    ).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("동의자가 없으면 발송 안 해요", async () => {
    const { listener, notificationService } = buildListener({
      agreedUserKeys: [],
    });

    await listener.handle(buildEvent([101, 202]));

    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("동의자에게 추월 사건(제출 그림)+user별 referenceId로 발송해요", async () => {
    const { listener, notificationService } = buildListener({
      agreedUserKeys: [101, 202],
    });

    await listener.handle(buildEvent([101, 202, 303]));

    expect(notificationService.send).toHaveBeenCalledTimes(2);
    expect(notificationService.send).toHaveBeenNthCalledWith(1, {
      targetUserKey: 101,
      referenceId: "12345_101",
      type: NOTIFICATION_TYPE.OVERTAKEN,
      templateSetCode: "overtaken_v1",
      context: { day: "2026-05-28", newRank: 1 },
    });
    expect(notificationService.send).toHaveBeenNthCalledWith(2, {
      targetUserKey: 202,
      referenceId: "12345_202",
      type: NOTIFICATION_TYPE.OVERTAKEN,
      templateSetCode: "overtaken_v1",
      context: { day: "2026-05-28", newRank: 1 },
    });
  });

  it("한 사용자에 발송 실패해도 다른 사용자에 영향 안 줘요", async () => {
    const { listener, notificationService } = buildListener({
      agreedUserKeys: [101, 202, 303],
    });
    (notificationService.send as jest.Mock)
      .mockResolvedValueOnce({ sent: true })
      .mockRejectedValueOnce(new Error("토스 장애"))
      .mockResolvedValueOnce({ sent: true });

    await expect(listener.handle(buildEvent([101, 202, 303]))).resolves.toBe(
      undefined,
    );

    expect(notificationService.send).toHaveBeenCalledTimes(3);
  });

  it("동의자가 일부만 있을 때 동의자만 호출해요", async () => {
    const { listener, notificationAgreementRepository, notificationService } =
      buildListener({ agreedUserKeys: [202] });

    await listener.handle(buildEvent([101, 202, 303]));

    expect(
      notificationAgreementRepository.findAgreedUserKeysAmong,
    ).toHaveBeenCalledWith({
      userKeys: [101, 202, 303],
      type: NOTIFICATION_TYPE.OVERTAKEN,
      templateCode: "overtaken_v1",
    });
    expect(notificationService.send).toHaveBeenCalledTimes(1);
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ targetUserKey: 202 }),
    );
  });

  it("configService.getOrThrow가 throw해도 핸들러는 reject 안 해요", async () => {
    const { listener, configService, notificationService } = buildListener({
      agreedUserKeys: [101],
    });
    (configService.getOrThrow as jest.Mock).mockImplementation(() => {
      throw new Error("env missing");
    });

    await expect(listener.handle(buildEvent([101]))).resolves.toBe(undefined);
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("동의자 조회가 throw해도 핸들러는 reject 안 해요", async () => {
    const { listener, notificationAgreementRepository, notificationService } =
      buildListener({ agreedUserKeys: [101] });
    (
      notificationAgreementRepository.findAgreedUserKeysAmong as jest.Mock
    ).mockRejectedValueOnce(new Error("DB 장애"));

    await expect(listener.handle(buildEvent([101]))).resolves.toBe(undefined);
    expect(notificationService.send).not.toHaveBeenCalled();
  });
});
