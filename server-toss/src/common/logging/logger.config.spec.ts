import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from "http";
import {
  createLoggerParams,
  generateRequestId,
  getHttpAutoLogLevel,
  REDACTED_VALUE,
  REQUEST_ID_HEADER,
  RESPONSE_REQUEST_ID_HEADER,
} from "./logger.config";

function createRequest(
  headers: IncomingHttpHeaders = {},
  overrides: Partial<IncomingMessage> & { originalUrl?: string } = {},
): IncomingMessage & { originalUrl?: string; id?: unknown } {
  return {
    headers,
    method: "GET",
    url: "/",
    ...overrides,
  } as IncomingMessage & { originalUrl?: string; id?: unknown };
}

function createResponse(statusCode = 200) {
  const headers: Record<string, string> = {};

  return {
    statusCode,
    headers,
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
      return undefined;
    }),
  } as unknown as ServerResponse & {
    err?: Error;
    headers: Record<string, string>;
    setHeader: jest.Mock;
  };
}

describe("로거 설정", () => {
  describe("generateRequestId 함수는", () => {
    it("요청 헤더의 X-Request-Id를 재사용하고 응답 헤더에 넣는다", () => {
      const requestId = "incoming-request-id";
      const req = createRequest({ [REQUEST_ID_HEADER]: requestId });
      const res = createResponse();

      const result = generateRequestId(req, res);

      expect(result).toBe(requestId);
      expect(res.setHeader).toHaveBeenCalledWith(
        RESPONSE_REQUEST_ID_HEADER,
        requestId,
      );
    });

    it("요청 헤더가 없으면 UUID를 생성하고 응답 헤더에 넣는다", () => {
      const req = createRequest();
      const res = createResponse();

      const result = generateRequestId(req, res);

      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        RESPONSE_REQUEST_ID_HEADER,
        result,
      );
    });
  });

  describe("getHttpAutoLogLevel 함수는", () => {
    it("헬스체크 성공 요청은 로그를 생략한다", () => {
      const req = createRequest({}, { originalUrl: "/health" });
      const res = createResponse(200);

      expect(getHttpAutoLogLevel(req, res)).toBe("silent");
    });

    it("스트로크 성공 요청은 debug로 기록한다", () => {
      const req = createRequest(
        {},
        { method: "POST", originalUrl: "/strokes" },
      );
      const res = createResponse(201);

      expect(getHttpAutoLogLevel(req, res)).toBe("debug");
    });

    it("4xx 응답은 warn으로 기록한다", () => {
      const req = createRequest({}, { originalUrl: "/prompt" });
      const res = createResponse(404);

      expect(getHttpAutoLogLevel(req, res)).toBe("warn");
    });

    it("5xx 응답은 error로 기록한다", () => {
      const req = createRequest({}, { originalUrl: "/prompt" });
      const res = createResponse(500);

      expect(getHttpAutoLogLevel(req, res)).toBe("error");
    });
  });

  describe("createLoggerParams 함수는", () => {
    it("requestId를 공통 필드로 추가한다", () => {
      const params = createLoggerParams({ nodeEnv: "production" });
      const pinoHttp = params.pinoHttp as {
        customProps: (req: IncomingMessage & { id?: unknown }) => object;
      };
      const req = createRequest({}, { id: "request-id-1" });

      expect(pinoHttp.customProps(req)).toEqual({
        requestId: "request-id-1",
      });
    });

    it("민감 헤더를 마스킹하도록 설정한다", () => {
      const params = createLoggerParams({ nodeEnv: "production" });
      const pinoHttp = params.pinoHttp as {
        redact: { paths: string[]; censor: string };
      };

      expect(pinoHttp.redact.censor).toBe(REDACTED_VALUE);
      expect(pinoHttp.redact.paths).toEqual(
        expect.arrayContaining([
          "req.headers.authorization",
          "req.headers.cookie",
          'req.headers["set-cookie"]',
          'res.headers["set-cookie"]',
        ]),
      );
      expect(pinoHttp.redact.paths).not.toContain("req.body");
    });
  });
});
