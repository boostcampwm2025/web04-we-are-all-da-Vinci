import { describe, expect, it } from "vitest";
import { drawingQueries } from "./drawingQueries";

describe("그림 상세 쿼리 정의", () => {
  it("drawingId가 키에 들어가 param 변경이 곧 새 요청이 된다", () => {
    expect(drawingQueries.detail("42").queryKey).toEqual(["drawing", "42"]);
    expect(drawingQueries.detail("43").queryKey).not.toEqual(
      drawingQueries.detail("42").queryKey,
    );
  });

  it("제출된 그림은 불변이라 재요청하지 않고, strokes가 커서 영속하지 않는다", () => {
    const options = drawingQueries.detail("42");
    expect(options.staleTime).toBe(Infinity);
    expect(options.meta?.persist).toBeUndefined();
  });
});
