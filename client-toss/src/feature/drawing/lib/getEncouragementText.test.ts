import { describe, expect, it } from "vitest";
import { getEncouragementText } from "./getEncouragementText";

describe("getEncouragementText", () => {
  describe("아직 한 획도 그리지 않았을 때", () => {
    it("도입 문구를 반환한다", () => {
      expect(getEncouragementText(0, null, false)).toBe(
        "외운 그림을 떠올려봐요",
      );
    });

    it("점수나 추세와 무관하게 도입 문구를 반환한다", () => {
      expect(getEncouragementText(50, "up", false)).toBe(
        "외운 그림을 떠올려봐요",
      );
      expect(getEncouragementText(90, "down", false)).toBe(
        "외운 그림을 떠올려봐요",
      );
    });
  });

  describe("추세가 있을 때 (한 획 이상 그린 상태)", () => {
    it("up 추세에서는 응원 문구를 반환한다", () => {
      expect(getEncouragementText(40, "up", true)).toBe("점수가 올라가요");
    });

    it("down 추세에서는 격려 문구를 반환한다", () => {
      expect(getEncouragementText(40, "down", true)).toBe("조금만 신중하게");
    });

    it("추세는 점수 구간 문구보다 우선한다", () => {
      expect(getEncouragementText(85, "up", true)).toBe("점수가 올라가요");
      expect(getEncouragementText(85, "down", true)).toBe("조금만 신중하게");
    });
  });

  describe("추세가 없을 때 점수 구간별 문구", () => {
    it("0~29점 구간 문구", () => {
      expect(getEncouragementText(0, null, true)).toBe("차근차근 그려봐요");
      expect(getEncouragementText(29, null, true)).toBe("차근차근 그려봐요");
    });

    it("30~59점 구간 문구", () => {
      expect(getEncouragementText(30, null, true)).toBe("시작이 좋아요");
      expect(getEncouragementText(59, null, true)).toBe("시작이 좋아요");
    });

    it("60~79점 구간 문구", () => {
      expect(getEncouragementText(60, null, true)).toBe("잘하고 있어요");
      expect(getEncouragementText(79, null, true)).toBe("잘하고 있어요");
    });

    it("80점 이상 구간 문구", () => {
      expect(getEncouragementText(80, null, true)).toBe("거의 다 왔어요");
      expect(getEncouragementText(100, null, true)).toBe("거의 다 왔어요");
    });
  });
});
