import type { ConfigService } from "@nestjs/config";
import { EventEmitter } from "events";
import https from "https";
import {
  TossApiError,
  TossTransportError,
} from "src/modules/auth/errors/toss.errors";
import { TossApiClient } from "src/modules/auth/toss-api.client";

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readFileSync: jest.fn(() => Buffer.from("dummy")),
}));

jest.mock("https", () => {
  const actual = jest.requireActual<typeof import("https")>("https");
  return {
    __esModule: true,
    default: {
      ...actual,
      Agent: jest.fn().mockImplementation(() => ({})),
      request: jest.fn(),
    },
    Agent: jest.fn().mockImplementation(() => ({})),
    request: jest.fn(),
  };
});

const buildClient = () => {
  const config = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        TOSS_API_BASE_URL: "https://test.example.com",
        TOSS_API_KEY: "test-api-key",
        TOSS_CLIENT_CERT_PATH: "/tmp/cert.pem",
        TOSS_CLIENT_KEY_PATH: "/tmp/key.pem",
      };
      return values[key];
    }),
  } as unknown as ConfigService;
  return new TossApiClient(config);
};

type RequestSpyArgs = {
  options: https.RequestOptions;
  body?: string;
};

/**
 * https.request 호출 1회를 모킹한다.
 * - response: statusCode + body를 emit
 * - timeout: req.timeout 이벤트 emit
 * - networkError: req.error 이벤트 emit
 */
const mockRequestOnce = (
  scenario:
    | { kind: "response"; statusCode: number; body: string }
    | { kind: "timeout" }
    | { kind: "networkError"; error: Error },
): { capture: () => RequestSpyArgs } => {
  let capturedOptions: https.RequestOptions | undefined;
  let capturedBody: string | undefined;

  (https.request as jest.Mock).mockImplementationOnce(
    (
      options: https.RequestOptions,
      callback: (res: EventEmitter & { statusCode?: number }) => void,
    ) => {
      capturedOptions = options;

      const req = new EventEmitter() as EventEmitter & {
        write: (chunk: string) => void;
        end: () => void;
        destroy: (err?: Error) => void;
      };
      req.write = (chunk: string) => {
        capturedBody = chunk;
      };
      req.destroy = () => undefined;
      req.end = () => {
        process.nextTick(() => {
          if (scenario.kind === "timeout") {
            req.emit("timeout");
            return;
          }
          if (scenario.kind === "networkError") {
            req.emit("error", scenario.error);
            return;
          }
          const res = new EventEmitter() as EventEmitter & {
            statusCode?: number;
          };
          res.statusCode = scenario.statusCode;
          callback(res);
          res.emit("data", Buffer.from(scenario.body));
          res.emit("end");
        });
      };
      return req;
    },
  );

  return {
    capture: () => ({
      options: capturedOptions!,
      body: capturedBody,
    }),
  };
};

describe("TossApiClient.sendMessage", () => {
  beforeEach(() => {
    (https.request as jest.Mock).mockReset();
  });

  it("정상 응답(SUCCESS)일 때 result를 그대로 반환한다", async () => {
    const client = buildClient();
    mockRequestOnce({
      kind: "response",
      statusCode: 200,
      body: JSON.stringify({
        resultType: "SUCCESS",
        result: {
          msgCount: 1,
          sentPushCount: 1,
          sentInboxCount: 0,
          sentSmsCount: 0,
          sentAlimtalkCount: 0,
          sentFriendtalkCount: 0,
          detail: {
            sentPush: [{ contentId: "toss:PUSH:abc" }],
            sentInbox: [],
            sentSms: [],
            sentAlimtalk: [],
            sentFriendtalk: [],
          },
          fail: {
            sentPush: [],
            sentInbox: [],
            sentSms: [],
            sentAlimtalk: [],
            sentFriendtalk: [],
          },
        },
      }),
    });

    const res = await client.sendMessage({
      userKey: 12345,
      templateSetCode: "daily_prompt_v1",
      context: { date: "2026-05-26" },
    });

    expect(res.resultType).toBe("SUCCESS");
    expect(res.result?.sentPushCount).toBe(1);
    expect(res.result?.detail.sentPush).toEqual([
      { contentId: "toss:PUSH:abc" },
    ]);
  });

  it("부분 실패가 포함된 SUCCESS 응답도 throw 없이 반환한다", async () => {
    const client = buildClient();
    mockRequestOnce({
      kind: "response",
      statusCode: 200,
      body: JSON.stringify({
        resultType: "SUCCESS",
        result: {
          msgCount: 1,
          sentPushCount: 0,
          sentInboxCount: 1,
          sentSmsCount: 0,
          sentAlimtalkCount: 0,
          sentFriendtalkCount: 0,
          detail: {
            sentPush: [],
            sentInbox: [{ contentId: "toss:INBOX:x" }],
            sentSms: [],
            sentAlimtalk: [],
            sentFriendtalk: [],
          },
          fail: {
            sentPush: [
              {
                contentId: "toss:PUSH:fail",
                reachFailReason: "PERMISSION_DENIED",
              },
            ],
            sentInbox: [],
            sentSms: [],
            sentAlimtalk: [],
            sentFriendtalk: [],
          },
        },
      }),
    });

    const res = await client.sendMessage({
      userKey: 1,
      templateSetCode: "t",
      context: {},
    });

    expect(res.resultType).toBe("SUCCESS");
    expect(res.result?.fail.sentPush[0]?.reachFailReason).toBe(
      "PERMISSION_DENIED",
    );
  });

  it("resultType FAIL이어도 throw 없이 반환한다", async () => {
    const client = buildClient();
    mockRequestOnce({
      kind: "response",
      statusCode: 200,
      body: JSON.stringify({
        resultType: "FAIL",
        error: { errorCode: "TEMPLATE_NOT_FOUND", reason: "템플릿이 없습니다" },
      }),
    });

    const res = await client.sendMessage({
      userKey: 1,
      templateSetCode: "unknown",
      context: {},
    });

    expect(res.resultType).toBe("FAIL");
    expect(res.error?.errorCode).toBe("TEMPLATE_NOT_FOUND");
  });

  it("statusCode 500이면 TossApiError를 throw한다", async () => {
    const client = buildClient();
    mockRequestOnce({
      kind: "response",
      statusCode: 500,
      body: "internal error",
    });

    await expect(
      client.sendMessage({ userKey: 1, templateSetCode: "t", context: {} }),
    ).rejects.toBeInstanceOf(TossApiError);
  });

  it("타임아웃이면 TossTransportError를 throw한다", async () => {
    const client = buildClient();
    mockRequestOnce({ kind: "timeout" });

    await expect(
      client.sendMessage({ userKey: 1, templateSetCode: "t", context: {} }),
    ).rejects.toBeInstanceOf(TossTransportError);
  });

  it("응답 스키마가 어긋나면 TossTransportError를 throw한다", async () => {
    const client = buildClient();
    mockRequestOnce({
      kind: "response",
      statusCode: 200,
      body: JSON.stringify({ unexpectedField: true }),
    });

    await expect(
      client.sendMessage({ userKey: 1, templateSetCode: "t", context: {} }),
    ).rejects.toBeInstanceOf(TossTransportError);
  });

  it("헤더에 Authorization Bearer와 x-toss-user-key가 모두 포함된다", async () => {
    const client = buildClient();
    const spy = mockRequestOnce({
      kind: "response",
      statusCode: 200,
      body: JSON.stringify({
        resultType: "SUCCESS",
        result: {
          msgCount: 0,
          sentPushCount: 0,
          sentInboxCount: 0,
          sentSmsCount: 0,
          sentAlimtalkCount: 0,
          sentFriendtalkCount: 0,
          detail: {
            sentPush: [],
            sentInbox: [],
            sentSms: [],
            sentAlimtalk: [],
            sentFriendtalk: [],
          },
          fail: {
            sentPush: [],
            sentInbox: [],
            sentSms: [],
            sentAlimtalk: [],
            sentFriendtalk: [],
          },
        },
      }),
    });

    await client.sendMessage({
      userKey: 9999,
      templateSetCode: "t",
      context: {},
    });

    const { options } = spy.capture();
    expect(options.headers).toMatchObject({
      Authorization: "Bearer test-api-key",
      "x-toss-user-key": "9999",
      "Content-Type": "application/json",
    });
    expect(options.method).toBe("POST");
    expect(options.path).toBe(
      "/api-partner/v1/apps-in-toss/messenger/send-message",
    );
  });

  it("body에 templateSetCode와 context가 직렬화된다", async () => {
    const client = buildClient();
    const spy = mockRequestOnce({
      kind: "response",
      statusCode: 200,
      body: JSON.stringify({
        resultType: "SUCCESS",
        result: {
          msgCount: 0,
          sentPushCount: 0,
          sentInboxCount: 0,
          sentSmsCount: 0,
          sentAlimtalkCount: 0,
          sentFriendtalkCount: 0,
          detail: {
            sentPush: [],
            sentInbox: [],
            sentSms: [],
            sentAlimtalk: [],
            sentFriendtalk: [],
          },
          fail: {
            sentPush: [],
            sentInbox: [],
            sentSms: [],
            sentAlimtalk: [],
            sentFriendtalk: [],
          },
        },
      }),
    });

    await client.sendMessage({
      userKey: 1,
      templateSetCode: "daily_prompt_v1",
      context: { storeName: "토스증권", date: "2026-05-26" },
    });

    const { body } = spy.capture();
    expect(body).toBeDefined();
    const parsed = JSON.parse(body!) as {
      templateSetCode: string;
      context: Record<string, string>;
    };
    expect(parsed.templateSetCode).toBe("daily_prompt_v1");
    expect(parsed.context).toEqual({
      storeName: "토스증권",
      date: "2026-05-26",
    });
  });
});

describe("TossApiClient.sendBulkMessage", () => {
  beforeEach(() => {
    (https.request as jest.Mock).mockReset();
  });

  it("대량 발송 API에 contextList를 보내고 사용자 헤더는 넣지 않는다", async () => {
    const client = buildClient();
    const spy = mockRequestOnce({
      kind: "response",
      statusCode: 200,
      body: JSON.stringify({
        resultType: "SUCCESS",
        result: {
          msgCount: 2,
          sentPushCount: 2,
          sentInboxCount: 0,
          sentSmsCount: 0,
          sentAlimtalkCount: 0,
          sentFriendtalkCount: 0,
          detail: {
            sentPush: [
              { contentId: "toss:PUSH:1" },
              { contentId: "toss:PUSH:2" },
            ],
            sentInbox: [],
            sentSms: [],
            sentAlimtalk: [],
            sentFriendtalk: [],
          },
          fail: {
            sentPush: [],
            sentInbox: [],
            sentSms: [],
            sentAlimtalk: [],
            sentFriendtalk: [],
          },
        },
      }),
    });

    const res = await client.sendBulkMessage({
      templateSetCode: "daily_prompt_v1",
      contextList: [
        { userKey: 101, context: {} },
        { userKey: 202, context: { date: "2026-05-26" } },
      ],
    });

    expect(res.resultType).toBe("SUCCESS");
    expect(res.result?.msgCount).toBe(2);

    const { options, body } = spy.capture();
    expect(options.method).toBe("POST");
    expect(options.path).toBe(
      "/api-partner/v1/apps-in-toss/messenger/send-bulk-message",
    );
    expect(options.headers).toMatchObject({
      Authorization: "Bearer test-api-key",
      "Content-Type": "application/json",
    });
    expect(options.headers).not.toHaveProperty("x-toss-user-key");
    expect(JSON.parse(body!)).toEqual({
      templateSetCode: "daily_prompt_v1",
      contextList: [
        { userKey: 101, context: {} },
        { userKey: 202, context: { date: "2026-05-26" } },
      ],
    });
  });
});
