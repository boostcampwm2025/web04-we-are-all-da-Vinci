import { safeParseStrokes } from "./safe-parse.util";

describe("safeParseStrokes", () => {
  it("정상 JSON은 그대로 파싱한다", () => {
    const raw = JSON.stringify([
      {
        points: [
          [1, 2],
          [3, 4],
        ],
        color: [0, 0, 0],
      },
    ]);
    expect(safeParseStrokes(raw)).toHaveLength(1);
  });

  it("잘린 JSON에서 완전한 stroke만 복구한다", () => {
    const full = JSON.stringify([
      {
        points: [
          [1, 2],
          [3, 4],
        ],
        color: [0, 0, 0],
      },
      {
        points: [
          [5, 6],
          [7, 8],
        ],
        color: [34, 197, 94],
      },
    ]);
    const truncated = full.slice(0, full.length - 15); // 두 번째 객체 중간에서 자름
    const result = safeParseStrokes(truncated);
    expect(result).toHaveLength(1);
    expect(result[0].color).toEqual([0, 0, 0]);
  });

  it("완전한 stroke가 하나도 없으면 빈 배열을 반환한다", () => {
    const truncated = '[{"points":[[1,2';
    expect(safeParseStrokes(truncated)).toEqual([]);
  });
});
