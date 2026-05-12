import { NotFoundException } from "@nestjs/common";
import { PlayService } from "./play.service";

describe("PlayService", () => {
  const date = new Date("2026-05-12T00:00:00.000Z");

  const buildService = ({
    promptResult,
    promptError,
  }: {
    promptResult?: unknown;
    promptError?: Error;
  }) => {
    const fork = {};
    const em = {
      transactional: jest.fn(async (callback) => callback(fork)),
    };
    const chanceService = {
      consumeWithEntityManager: jest.fn().mockResolvedValue({ count: 0 }),
    };
    const promptService = {
      getPromptByDate: jest.fn(async () => {
        if (promptError) throw promptError;
        return promptResult;
      }),
    };

    return {
      fork,
      em,
      chanceService,
      promptService,
      service: new PlayService(
        em as never,
        chanceService as never,
        promptService as never,
      ),
    };
  };

  it("프롬프트가 있으면 같은 트랜잭션에서 기회를 소비하고 프롬프트를 반환한다", async () => {
    const prompt = {
      promptId: 278,
      strokes: [{ points: [[1], [2]], color: [0, 0, 0] }],
    };
    const { fork, chanceService, promptService, service } = buildService({
      promptResult: prompt,
    });

    await expect(service.start(760442640, date)).resolves.toEqual(prompt);
    expect(promptService.getPromptByDate).toHaveBeenCalledWith(date, fork);
    expect(chanceService.consumeWithEntityManager).toHaveBeenCalledWith(
      fork,
      760442640,
    );
  });

  it("프롬프트가 없으면 기회를 소비하지 않고 NotFoundException을 던진다", async () => {
    const { chanceService, service } = buildService({
      promptError: new NotFoundException("PROMPT_NOT_FOUND"),
    });

    await expect(service.start(760442640, date)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(chanceService.consumeWithEntityManager).not.toHaveBeenCalled();
  });
});
