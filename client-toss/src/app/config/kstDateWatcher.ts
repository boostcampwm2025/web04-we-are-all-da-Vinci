import { getKstDate } from "@/shared/lib";
import type { QueryClient } from "@tanstack/react-query";

/**
 * "오늘" 리소스의 날짜 키는 렌더 시점에 계산된다. 화면을 열어둔 채(주로 백그라운드에서) KST 자정을
 * 넘기면 다음 렌더까지 옛 키가 남으므로, 포그라운드 복귀 시 날짜가 바뀌었으면 옛 날짜 키를 든
 * 활성 쿼리를 무효화해 값이 제자리에서 오늘 값으로 바뀌게 한다.
 * @returns 해제 함수
 */
export const installKstDateWatcher = (
  queryClient: QueryClient,
  doc: Document = document,
) => {
  let lastSeenDate = getKstDate();

  const check = () => {
    if (doc.visibilityState !== "visible") return;
    const today = getKstDate();
    if (today === lastSeenDate) return;
    const previousDate = lastSeenDate;
    lastSeenDate = today;
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey.includes(previousDate),
    });
  };

  doc.addEventListener("visibilitychange", check);
  return () => doc.removeEventListener("visibilitychange", check);
};
