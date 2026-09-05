import { QueryClient, queryOptions } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PERSIST_BUSTER,
  PERSIST_KEY,
  PERSIST_MAX_AGE,
  createLocalStoragePersister,
  dehydrateForPersist,
  restoreQueryClientSync,
  setupQueryPersistence,
} from "./queryPersistence";

const persistedQuery = queryOptions({
  queryKey: ["points", "me", "2026-05-03"],
  queryFn: async () => ({ totalPoints: 300 }),
  meta: { persist: true },
});

const bigQuery = queryOptions({
  queryKey: ["rankings", "list", "2026-05-03"],
  queryFn: async () => ({ rankings: [] }),
});

const makeClient = () =>
  new QueryClient({
    defaultOptions: { queries: { gcTime: PERSIST_MAX_AGE, retry: false } },
  });

// setQueryData는 meta를 붙이지 않는다 — 앱에서 useQuery가 하듯 queryOptions로 쿼리를 만든다.
const seed = async (queryClient: QueryClient) => {
  await queryClient.fetchQuery(persistedQuery);
  await queryClient.fetchQuery(bigQuery);
};

const writeSnapshot = (
  queryClient: QueryClient,
  overrides: Partial<{ buster: string; timestamp: number }> = {},
) => {
  localStorage.setItem(
    PERSIST_KEY,
    JSON.stringify({
      buster: PERSIST_BUSTER,
      timestamp: Date.now(),
      clientState: dehydrateForPersist(queryClient),
      ...overrides,
    }),
  );
};

describe("서버 상태 캐시 영속화", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T03:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("저장 대상 필터", () => {
    it("meta.persist가 true인 쿼리만 디스크에 쓴다", async () => {
      const queryClient = makeClient();
      await seed(queryClient);

      const state = dehydrateForPersist(queryClient);
      const keys = state.queries.map((q) => q.queryKey);

      expect(keys).toContainEqual(persistedQuery.queryKey);
      expect(keys).not.toContainEqual(bigQuery.queryKey);
    });

    it("캐시가 바뀌면 throttle 뒤 localStorage에 저장된다", async () => {
      const queryClient = makeClient();
      const unsubscribe = setupQueryPersistence(
        queryClient,
        createLocalStoragePersister(localStorage, { throttleMs: 50 }),
      );

      await seed(queryClient);
      expect(localStorage.getItem(PERSIST_KEY)).toBeNull();

      vi.advanceTimersByTime(50);
      const saved = JSON.parse(localStorage.getItem(PERSIST_KEY) ?? "{}");
      expect(saved.buster).toBe(PERSIST_BUSTER);
      expect(saved.clientState.queries).toHaveLength(1);
      unsubscribe();
    });
  });

  describe("동기 복원", () => {
    it("같은 buster·maxAge 안이면 첫 렌더 전에 값이 복원된다", async () => {
      const source = makeClient();
      await seed(source);
      writeSnapshot(source);

      const target = makeClient();
      const restored = restoreQueryClientSync(
        target,
        createLocalStoragePersister(localStorage),
      );

      expect(restored).toBe(true);
      expect(target.getQueryData(persistedQuery.queryKey)).toEqual({
        totalPoints: 300,
      });
      expect(target.getQueryData(bigQuery.queryKey)).toBeUndefined();
    });

    it("복원된 쿼리는 원래 dataUpdatedAt을 유지해 staleness 판단이 정확하다", async () => {
      const source = makeClient();
      await seed(source);
      const originalUpdatedAt = source.getQueryState(
        persistedQuery.queryKey,
      )?.dataUpdatedAt;
      writeSnapshot(source);

      vi.advanceTimersByTime(60_000);
      const target = makeClient();
      restoreQueryClientSync(target, createLocalStoragePersister(localStorage));

      expect(target.getQueryState(persistedQuery.queryKey)?.dataUpdatedAt).toBe(
        originalUpdatedAt,
      );
    });

    it("buster가 다르면 폐기하고 localStorage도 비운다", async () => {
      const source = makeClient();
      await seed(source);
      writeSnapshot(source, { buster: "0" });

      const target = makeClient();
      const restored = restoreQueryClientSync(
        target,
        createLocalStoragePersister(localStorage),
      );

      expect(restored).toBe(false);
      expect(target.getQueryData(persistedQuery.queryKey)).toBeUndefined();
      expect(localStorage.getItem(PERSIST_KEY)).toBeNull();
    });

    it("maxAge(24시간)를 넘긴 스냅샷은 폐기한다", async () => {
      const source = makeClient();
      await seed(source);
      writeSnapshot(source, {
        timestamp: Date.now() - PERSIST_MAX_AGE - 1,
      });

      const target = makeClient();
      const restored = restoreQueryClientSync(
        target,
        createLocalStoragePersister(localStorage),
      );

      expect(restored).toBe(false);
      expect(localStorage.getItem(PERSIST_KEY)).toBeNull();
    });

    it("손상된 JSON이면 크래시 없이 캐시를 지우고 빈 상태로 시작한다", () => {
      localStorage.setItem(PERSIST_KEY, "{not json");

      const target = makeClient();
      const restored = restoreQueryClientSync(
        target,
        createLocalStoragePersister(localStorage),
      );

      expect(restored).toBe(false);
      expect(localStorage.getItem(PERSIST_KEY)).toBeNull();
    });

    it("localStorage가 없으면(null) no-op persister로 동작한다", () => {
      const target = makeClient();
      const persister = createLocalStoragePersister(null);

      expect(restoreQueryClientSync(target, persister)).toBe(false);
      expect(() => persister.persistClient({} as never)).not.toThrow();
    });
  });

  describe("저장 실패", () => {
    it("quota 초과 시 오래된 쿼리부터 버리고 재시도한다", async () => {
      const store = new Map<string, string>();
      let failures = 1;
      const storage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          if (failures > 0) {
            failures -= 1;
            throw new Error("QuotaExceededError");
          }
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      };
      const queryClient = makeClient();
      await queryClient.fetchQuery({
        queryKey: ["old"],
        queryFn: async () => 1,
        meta: { persist: true },
      });
      vi.advanceTimersByTime(10);
      await queryClient.fetchQuery({
        queryKey: ["new"],
        queryFn: async () => 2,
        meta: { persist: true },
      });

      const persister = createLocalStoragePersister(storage, { throttleMs: 0 });
      persister.persistClient({
        buster: PERSIST_BUSTER,
        timestamp: Date.now(),
        clientState: dehydrateForPersist(queryClient),
      });
      vi.advanceTimersByTime(0);

      const saved = JSON.parse(store.get(PERSIST_KEY) ?? "{}");
      const keys = saved.clientState.queries.map(
        (q: { queryKey: unknown }) => q.queryKey,
      );
      expect(keys).toEqual([["new"]]);
    });
  });
});
