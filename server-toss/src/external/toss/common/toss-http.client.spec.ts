import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import https from "https";
import { TossHttpClient } from "./toss-http.client";
import { TossTransportError } from "./toss.errors";

jest.mock("fs", () => ({ readFileSync: jest.fn(() => Buffer.from("test")) }));
jest.mock("https", () => ({
  __esModule: true,
  default: { Agent: jest.fn(), request: jest.fn() },
}));

describe("토스 HTTP 요청 시간 제한", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  function setup() {
    const req = Object.assign(new EventEmitter(), {
      write: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn(),
    });
    jest.mocked(https.request).mockReturnValue(req as unknown as ClientRequest);
    const client = new TossHttpClient(
      new ConfigService({
        TOSS_API_BASE_URL: "https://example.test",
        TOSS_CLIENT_CERT_PATH: "test-cert",
        TOSS_CLIENT_KEY_PATH: "test-key",
      }),
    );
    const respond = () => {
      const res = Object.assign(new EventEmitter(), { statusCode: 200 });
      const callback = jest.mocked(https.request).mock.calls[0].at(-1) as (
        res: IncomingMessage,
      ) => void;
      callback(res as unknown as IncomingMessage);
      return res;
    };
    return { client, req, respond };
  }

  it("소켓 timeout 이벤트가 없어도 요청 시작 10초 후 중단한다", async () => {
    const { client, req } = setup();
    const result = client.request("POST", "/promotion", {});
    const rejected = expect(result).rejects.toBeInstanceOf(TossTransportError);

    jest.advanceTimersByTime(9_999);
    expect(req.destroy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);

    await rejected;
    expect(req.destroy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("응답 조각이 도착하더라도 전체 10초 제한을 연장하지 않는다", async () => {
    const { client, req, respond } = setup();
    const result = client.request("POST", "/promotion", {});
    const rejected = expect(result).rejects.toBeInstanceOf(TossTransportError);
    const res = respond();

    jest.advanceTimersByTime(9_000);
    res.emit("data", Buffer.from("{"));
    jest.advanceTimersByTime(1_000);

    await rejected;
    expect(req.destroy).toHaveBeenCalledTimes(1);
  });

  it("정상 응답이 완료되면 타이머를 해제하고 이후 요청을 중단하지 않는다", async () => {
    const { client, req, respond } = setup();
    const result = client.request("POST", "/promotion", {});
    const res = respond();
    res.emit("data", Buffer.from('{"resultType":"SUCCESS"}'));
    res.emit("end");

    await expect(result).resolves.toEqual({ resultType: "SUCCESS" });
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(10_000);
    expect(req.destroy).not.toHaveBeenCalled();
  });

  it("통신 오류가 발생해도 타이머를 해제한다", async () => {
    const { client, req } = setup();
    const result = client.request("POST", "/promotion", {});
    const rejected = expect(result).rejects.toBeInstanceOf(TossTransportError);

    req.emit("error", new Error("connection reset"));

    await rejected;
    expect(jest.getTimerCount()).toBe(0);
  });
});
