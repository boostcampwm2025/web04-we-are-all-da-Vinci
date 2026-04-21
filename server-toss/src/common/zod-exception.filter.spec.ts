import { ArgumentsHost } from "@nestjs/common";
import { z, ZodError } from "zod";
import { ZodExceptionFilter } from "./zod-exception.filter";

const buildHost = () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const response = { status };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
};

describe("ZodExceptionFilter", () => {
  it("ZodError를 400 응답과 issue 배열로 변환한다", () => {
    const filter = new ZodExceptionFilter();
    const { host, status, json } = buildHost();
    const schema = z.object({ age: z.number() });
    const parsed = schema.safeParse({ age: "x" });
    if (parsed.success) throw new Error("should fail");

    filter.catch(parsed.error as ZodError, host);

    expect(status).toHaveBeenCalledWith(400);
    const payload = json.mock.calls[0][0] as {
      message: string;
      issues: unknown[];
    };
    expect(payload.message).toBe("Validation 실패");
    expect(Array.isArray(payload.issues)).toBe(true);
  });
});
