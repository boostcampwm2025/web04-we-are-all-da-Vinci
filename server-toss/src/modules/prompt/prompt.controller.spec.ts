import { INestApplication, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";
import { PromptController } from "./prompt.controller";
import { PromptService } from "./prompt.service";

describe("PromptController (e2e)", () => {
  let app: INestApplication<App>;
  const promptService = {
    getPromptByDate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromptController],
      providers: [{ provide: PromptService, useValue: promptService }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it("GET /prompt는 서비스 결과를 200으로 반환한다", async () => {
    promptService.getPromptByDate.mockResolvedValue({
      promptId: 7,
      strokes: [],
    });

    const res = await request(app.getHttpServer()).get("/prompt").expect(200);
    expect(res.body).toEqual({ promptId: 7, strokes: [] });
  });

  it("GET /prompt는 NotFoundException을 404로 변환한다", async () => {
    promptService.getPromptByDate.mockRejectedValue(
      new NotFoundException("PROMPT_NOT_FOUND"),
    );

    await request(app.getHttpServer()).get("/prompt").expect(404);
  });
});
