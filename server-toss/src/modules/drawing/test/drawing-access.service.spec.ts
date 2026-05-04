jest.mock("src/common/time.util", () => ({
  getSeoulDayRange: () => ({
    start: new Date("2026-05-03T15:00:00.000Z"),
    end: new Date("2026-05-04T15:00:00.000Z"),
  }),
}));

import { BadRequestException } from "@nestjs/common";
import { AdType, AdView } from "src/modules/ad/ad-view.entity";
import type { User } from "src/modules/user/user.entity";
import { Drawing } from "../drawing.entity";
import { DrawingAccessService } from "../service/drawing-access.service";

describe("DrawingAccessService", () => {
  const user = { userKey: 1234 } as User;

  const buildService = (drawingCount: number, adViewCount: number) => {
    const em = {
      count: jest
        .fn()
        .mockResolvedValueOnce(drawingCount)
        .mockResolvedValueOnce(adViewCount),
    };

    return {
      em,
      service: new DrawingAccessService(em as never),
    };
  };

  it("오늘 제출 수가 기본 기회와 광고 시청 수의 합보다 적으면 접근을 허용한다", async () => {
    const { em, service } = buildService(1, 1);

    await expect(service.canAccess(user)).resolves.toBe(true);

    expect(em.count).toHaveBeenNthCalledWith(1, Drawing, {
      user,
      createdAt: {
        $gte: new Date("2026-05-03T15:00:00.000Z"),
        $lt: new Date("2026-05-04T15:00:00.000Z"),
      },
    });
    expect(em.count).toHaveBeenNthCalledWith(2, AdView, {
      user,
      type: AdType.DRAWING,
      createdAt: {
        $gte: new Date("2026-05-03T15:00:00.000Z"),
        $lt: new Date("2026-05-04T15:00:00.000Z"),
      },
    });
  });

  it("오늘 제출 수가 허용 기회에 도달하면 접근을 거부한다", async () => {
    const { service } = buildService(2, 1);

    await expect(service.canAccess(user)).resolves.toBe(false);
  });

  it("접근 권한이 없으면 NO_DRAWING_CHANCE 예외를 던진다", async () => {
    const { service } = buildService(1, 0);

    const result = service.validateAccess(user);

    await expect(result).rejects.toThrow(BadRequestException);
    await expect(result).rejects.toThrow("NO_DRAWING_CHANCE");
  });
});
