import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { prefetchTab } from "./tabPrefetch";

vi.mock("@/shared/api", () => ({
  serverTossApi: new Proxy(
    {},
    { get: () => vi.fn().mockReturnValue(new Promise(() => {})) },
  ),
}));

const keysOf = (queryClient: QueryClient) =>
  queryClient
    .getQueryCache()
    .getAll()
    .map((query) => query.queryKey.slice(0, 2).join("/"));

describe("탭 의도 시점 프리페치", () => {
  it.each([
    [
      "/",
      [
        "attendance/status",
        "points/summary",
        "missions/today",
        "podium/",
        "rankings/me",
      ],
    ],
    ["/archive", ["user/me", "archive/summary"]],
    ["/mission", ["missions/me", "attendance/status"]],
    ["/ranking", ["rankings/list"]],
  ])("%s 탭은 첫 화면에 필요한 쿼리를 미리 요청한다", (path, expected) => {
    const queryClient = new QueryClient();

    prefetchTab(queryClient, path);

    const keys = keysOf(queryClient).map((key) =>
      key.replace(/\/\d{4}-.*$/, "/"),
    );
    expected.forEach((key) => expect(keys).toContain(key));
    expect(keys).toHaveLength(expected.length);
  });

  it("탭이 아닌 경로는 아무것도 하지 않는다", () => {
    const queryClient = new QueryClient();
    prefetchTab(queryClient, "/memorize");
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
