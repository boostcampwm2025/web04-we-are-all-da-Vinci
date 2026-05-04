import { ArgumentsHost, HttpException } from "@nestjs/common";
import { HttpExceptionFilter } from "./http-exception.filter";

const buildHost = () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const response = { status };
  const request = { url: "/drawing/42" };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
};

describe("HttpExceptionFilter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-04T12:34:56.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("문자열 HttpException을 표준 응답으로 변환한다", () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = buildHost();

    filter.catch(new HttpException("사용자를 찾을 수 없어요.", 404), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      timestamp: "2026-05-04T12:34:56.000Z",
      statusCode: 404,
      message: "사용자를 찾을 수 없어요.",
      path: "/drawing/42",
    });
  });

  it("객체 HttpException에서 message를 추출해 표준 응답으로 변환한다", () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = buildHost();

    filter.catch(
      new HttpException({ message: "검증 실패", code: "BAD_INPUT" }, 400),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      timestamp: "2026-05-04T12:34:56.000Z",
      statusCode: 400,
      message: "검증 실패",
      path: "/drawing/42",
    });
  });
});
