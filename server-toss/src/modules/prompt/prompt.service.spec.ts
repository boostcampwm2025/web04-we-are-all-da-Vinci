const preprocessStrokesMock = jest.fn((strokes: unknown) => ({
  source: strokes,
}));

jest.mock("@davinci/similarity", () => ({
  preprocessStrokes: preprocessStrokesMock,
}));

import { NotFoundException } from "@nestjs/common";
import type { DailyPrompt } from "./daily-prompt.entity";
import type { Prompt } from "./prompt.entity";
import { PromptService } from "./prompt.service";
import { User } from "../user/user.entity";

const sampleStrokes = [
  {
    points: [
      [0, 1],
      [0, 1],
    ],
    color: [255, 0, 0],
  },
];

const buildDaily = (id: number, strokes: unknown): Partial<DailyPrompt> => ({
  prompt: {
    id: BigInt(id),
    strokes: JSON.stringify(strokes),
  } as unknown as Prompt,
});

describe("PromptService", () => {
  let userService: never;
  let drawingAccessService: never;
  let givenUser: User;

  beforeAll(() => {
    givenUser = { id: BigInt(1) } as User;

    userService = { findUser: jest.fn().mockResolvedValue(givenUser) } as never;
    drawingAccessService = {
      validateAccess: jest.fn().mockResolvedValue(() => undefined),
    } as never;
  });

  beforeEach(() => {
    preprocessStrokesMock.mockClear();
  });

  describe("getPromptByDate", () => {
    it("해당 날짜 daily_prompt이 있으면 promptId와 strokes를 반환한다", async () => {
      const dailyRepo = {
        findOne: jest.fn(async () => buildDaily(7, sampleStrokes)),
      };
      const service = new PromptService(
        dailyRepo as never,
        userService,
        drawingAccessService,
      );

      const result = await service.getPromptByDate(
        new Date(Date.UTC(2026, 3, 15)),
      );

      expect(result.promptId).toBe(7);
      expect(result.strokes).toEqual(sampleStrokes);
      expect(dailyRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it("해당 날짜 daily_prompt이 없으면 NotFoundException을 던진다", async () => {
      const dailyRepo = { findOne: jest.fn(async () => null) };
      const service = new PromptService(
        dailyRepo as never,
        userService,
        drawingAccessService,
      );

      await expect(
        service.getPromptByDate(new Date(Date.UTC(2026, 3, 15))),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getPreprocessedByDate", () => {
    it("첫 호출에는 preprocessStrokes를 실행하고 결과를 캐싱한다", async () => {
      const dailyRepo = {
        findOne: jest.fn(async () => buildDaily(3, sampleStrokes)),
      } as never;
      const service = new PromptService(
        dailyRepo,
        userService,
        drawingAccessService,
      );
      const date = new Date(Date.UTC(2026, 3, 15));

      const first = await service.getPreprocessedByDate(date);
      expect(first.promptId).toBe(3);
      expect(preprocessStrokesMock).toHaveBeenCalledTimes(1);

      const second = await service.getPreprocessedByDate(date);
      expect(second.preprocessed).toBe(first.preprocessed);
      expect(preprocessStrokesMock).toHaveBeenCalledTimes(1);
    });

    it("날짜가 달라 promptId가 바뀌면 preprocessStrokes를 다시 실행한다", async () => {
      const dailyRepo = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(buildDaily(1, sampleStrokes))
          .mockResolvedValueOnce(buildDaily(2, sampleStrokes)),
      };

      const service = new PromptService(
        dailyRepo as never,
        userService,
        drawingAccessService,
      );

      await service.getPreprocessedByDate(new Date(Date.UTC(2026, 3, 15)));
      await service.getPreprocessedByDate(new Date(Date.UTC(2026, 3, 16)));

      expect(preprocessStrokesMock).toHaveBeenCalledTimes(2);
    });
  });
});
