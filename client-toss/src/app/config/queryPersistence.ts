import {
  type QueryClient,
  defaultShouldDehydrateQuery,
  dehydrate,
  hydrate,
} from "@tanstack/react-query";
import {
  type PersistedClient,
  type Persister,
  persistQueryClientSubscribe,
  removeOldestQuery,
} from "@tanstack/react-query-persist-client";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      /** true면 localStorage에 영속된다. strokes가 든 큰 응답에는 절대 붙이지 않는다. */
      persist?: boolean;
    };
  }
}

export const PERSIST_KEY = "davinci.queryCache";
/**
 * `@toss/shared` 응답 스키마(필드 추가·삭제·타입 변경)가 바뀌면 올린다.
 * 옛 모양의 캐시가 새 렌더에 들어가는 것을 막는 유일한 장치다. maxAge 24h는 피해 상한일 뿐이다.
 */
export const PERSIST_BUSTER = "1";
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

/** `queryOptions({ meta: { persist: true } })`로 정의 자리에서 선언한 쿼리만 디스크에 쓴다. */
export const shouldPersistQuery = (
  query: Parameters<typeof defaultShouldDehydrateQuery>[0],
): boolean =>
  defaultShouldDehydrateQuery(query) && query.meta?.persist === true;

/** 복원이 동기여야 하므로 restoreClient가 Promise를 돌려주지 않는 persister만 받는다. */
export interface SyncPersister extends Persister {
  restoreClient: () => PersistedClient | undefined;
}

/**
 * localStorage 동기 persister.
 * 공식 `createSyncStoragePersister`는 v5.102에서 deprecated(비동기 persister로 유도)인데,
 * 비동기 복원은 첫 프레임이 pending이라 이 앱의 목적(첫 프레임에 마지막 값)에 어긋난다.
 * 필요한 건 세 메서드뿐이라 직접 둔다. 저장은 throttle, quota 초과는 오래된 쿼리부터 버리고 재시도.
 */
export const createLocalStoragePersister = (
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null,
  { key = PERSIST_KEY, throttleMs = 1000 } = {},
): SyncPersister => {
  if (!storage) {
    return {
      persistClient: () => {},
      restoreClient: () => undefined,
      removeClient: () => {},
    };
  }

  const trySave = (client: PersistedClient): Error | undefined => {
    try {
      storage.setItem(key, JSON.stringify(client));
      return undefined;
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  };

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: PersistedClient | null = null;

  const flush = () => {
    timer = null;
    let client: PersistedClient | undefined = pending ?? undefined;
    pending = null;
    let error = client ? trySave(client) : undefined;
    let errorCount = 0;
    while (error && client) {
      errorCount += 1;
      client = removeOldestQuery({
        persistedClient: client,
        error,
        errorCount,
      });
      if (client) error = trySave(client);
    }
  };

  return {
    persistClient: (client) => {
      pending = client;
      if (timer === null) timer = setTimeout(flush, throttleMs);
    },
    restoreClient: () => {
      const raw = storage.getItem(key);
      return raw ? (JSON.parse(raw) as PersistedClient) : undefined;
    },
    removeClient: () => {
      storage.removeItem(key);
    },
  };
};

interface RestoreOptions {
  buster?: string;
  maxAge?: number;
  now?: () => number;
}

/**
 * 렌더 전에 **동기로** 복원한다.
 * `PersistQueryClientProvider`는 useEffect에서 비동기 복원하는 동안 자식을 pending으로 한 프레임 그린다 —
 * 콜드 첫 프레임이 `-` → 옛 값 → 새 값 3단계가 되어 영속화의 목적을 스스로 깬다.
 * buster 불일치·maxAge 초과·손상된 JSON은 전부 폐기하고 캐시 없이 시작한다.
 * @returns 복원 여부
 */
export const restoreQueryClientSync = (
  queryClient: QueryClient,
  persister: SyncPersister,
  {
    buster = PERSIST_BUSTER,
    maxAge = PERSIST_MAX_AGE,
    now = Date.now,
  }: RestoreOptions = {},
): boolean => {
  try {
    const restored = persister.restoreClient();
    if (!restored) return false;
    if (typeof restored.timestamp !== "number") {
      persister.removeClient();
      return false;
    }
    const expired = now() - restored.timestamp > maxAge;
    const busted = restored.buster !== buster;
    if (expired || busted) {
      persister.removeClient();
      return false;
    }
    hydrate(queryClient, restored.clientState);
    return true;
  } catch {
    // 손상된 JSON 등 — 캐시 없이 시작하면 된다.
    persister.removeClient();
    return false;
  }
};

/** 복원 + 이후 변경을 계속 저장. 구독 해제 함수를 돌려준다. */
export const setupQueryPersistence = (
  queryClient: QueryClient,
  persister: SyncPersister,
  options: RestoreOptions = {},
) => {
  restoreQueryClientSync(queryClient, persister, options);
  return persistQueryClientSubscribe({
    queryClient,
    persister,
    buster: options.buster ?? PERSIST_BUSTER,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
  });
};

/** 테스트·디버깅용 — 현재 캐시에서 디스크에 쓰일 부분만 뽑는다. */
export const dehydrateForPersist = (queryClient: QueryClient) =>
  dehydrate(queryClient, { shouldDehydrateQuery: shouldPersistQuery });
