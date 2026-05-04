import { ArgumentsHost } from "@nestjs/common";
import { z, ZodError } from "zod";
import { ZodExceptionFilter } from "./zod-exception.filter";

const buildHost = () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const response = { status };
  const request = { url: "/strokes" };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
};

describe("ZodExceptionFilter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-04T12:34:56.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("ZodError를 표준 응답으로 변환한다", () => {
    const filter = new ZodExceptionFilter();
    const { host, status, json } = buildHost();
    const schema = z.object({ age: z.number() });
    const parsed = schema.safeParse({ age: "x" });
    if (parsed.success) throw new Error("should fail");

    filter.catch(parsed.error as ZodError, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      timestamp: "2026-05-04T12:34:56.000Z",
      statusCode: 400,
      message: "요청 데이터가 올바르지 않아요 (Validation Failed)",
      path: "/strokes",
      issues: parsed.error.issues,
    });
  });
});
