import { serverTossApi } from "@/shared/api";
import { getTossShareLink, share } from "@apps-in-toss/web-framework";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { shareMyScore } from "./handleShare";

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    getMyRanking: vi.fn(),
  },
}));

const mockedGetMyRanking = serverTossApi.getMyRanking as unknown as Mock;
const mockedGetTossShareLink = getTossShareLink as unknown as Mock;
const mockedShare = share as unknown as Mock;

describe("shareMyScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetTossShareLink.mockResolvedValue("intoss://link");
  });

  it("랭킹이 있으면 점수와 등수를 담은 메시지를 공유한다", async () => {
    mockedGetMyRanking.mockResolvedValue({
      state: "FOUND",
      ranking: { score: 88, rank: 7 },
    });

    await shareMyScore();

    const message = mockedShare.mock.calls[0][0].message as string;
    expect(message).toContain("88");
    expect(message).toContain("7");
    expect(message).toContain("intoss://link");
  });

  it("랭킹이 없으면 링크만 공유한다", async () => {
    mockedGetMyRanking.mockResolvedValue({ state: "NOT_FOUND" });

    await shareMyScore();

    expect(mockedShare).toHaveBeenCalledWith({ message: "intoss://link" });
  });

  it("랭킹 조회가 실패해도 링크는 공유한다", async () => {
    mockedGetMyRanking.mockRejectedValue(new Error("network"));

    await shareMyScore();

    expect(mockedShare).toHaveBeenCalledWith({ message: "intoss://link" });
  });
});
