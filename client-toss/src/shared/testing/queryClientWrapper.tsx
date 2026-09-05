import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/** 테스트 전용 QueryClient — 재시도 없음, GC 없음(테스트 중 캐시가 사라지지 않게). */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });

/** `renderHook(..., { wrapper: withQueryClient() })` 형태로 쓴다. */
export const withQueryClient = (queryClient = createTestQueryClient()) => {
  const QueryClientWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return QueryClientWrapper;
};
