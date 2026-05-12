import { BadRequestException } from "@nestjs/common";
import type { User } from "src/modules/user/user.entity";
import { DrawingAccessService } from "../service/drawing-access.service";

describe("DrawingAccessService", () => {
  const user = { userKey: 1234 } as User;

  const buildService = (chanceCount: number) => {
    const chanceService = {
      getMyChance: jest.fn().mockResolvedValue({ count: chanceCount }),
    };

    return {
      chanceService,
      service: new DrawingAccessService(chanceService as never),
    };
  };

  it("남은 play chance가 있으면 접근을 허용한다", async () => {
    const { chanceService, service } = buildService(1);

    await expect(service.canAccess(user)).resolves.toBe(true);

    expect(chanceService.getMyChance).toHaveBeenCalledWith(user.userKey);
  });

  it("남은 play chance가 없으면 접근을 거부한다", async () => {
    const { service } = buildService(0);

    await expect(service.canAccess(user)).resolves.toBe(false);
  });

  it("접근 권한이 없으면 NO_DRAWING_CHANCE 예외를 던진다", async () => {
    const { service } = buildService(0);

    const result = service.validateAccess(user);

    await expect(result).rejects.toThrow(BadRequestException);
    await expect(result).rejects.toThrow("NO_DRAWING_CHANCE");
  });
});
