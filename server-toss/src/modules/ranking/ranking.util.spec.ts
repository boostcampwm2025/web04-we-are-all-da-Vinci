import { describe, expect, it } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import { parseOptionalUserIdHeader, parseUserIdHeader } from "./ranking.util";

describe("랭킹 유틸", () => {
  describe("parseUserIdHeader는", () => {
    describe("숫자 문자열 헤더가 주어지면", () => {
      it("빅인트로 변환한다", () => {
        expect(parseUserIdHeader("123")).toBe(123n);
        expect(parseUserIdHeader(["456"])).toBe(456n);
      });
    });

    describe("헤더가 없거나 숫자 문자열이 아니면", () => {
      it("400 에러를 던진다", () => {
        expect(() => parseUserIdHeader(undefined)).toThrow(BadRequestException);
        expect(() => parseUserIdHeader("abc")).toThrow(BadRequestException);
      });
    });
  });

  describe("parseOptionalUserIdHeader는", () => {
    describe("헤더가 없으면", () => {
      it("undefined를 반환한다", () => {
        expect(parseOptionalUserIdHeader(undefined)).toBeUndefined();
      });
    });

    describe("숫자 문자열 헤더가 주어지면", () => {
      it("빅인트로 변환한다", () => {
        expect(parseOptionalUserIdHeader("123")).toBe(123n);
      });
    });

    describe("숫자 문자열이 아니면", () => {
      it("400 에러를 던진다", () => {
        expect(() => parseOptionalUserIdHeader("abc")).toThrow(
          BadRequestException,
        );
      });
    });
  });
});
