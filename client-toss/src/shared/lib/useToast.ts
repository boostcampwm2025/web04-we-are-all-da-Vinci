import { useCallback, useState } from "react";

/**
 * TDS `<Toast>` 제어용 상태 훅. open/text 상태 + show/close 핸들러를 묶어 제공한다.
 * (자동 닫힘은 Toast의 duration이 처리하므로 close는 수동 닫기/onClose용)
 *
 * show/close는 useCallback으로 안정 참조를 유지한다 — 호출부가 이 핸들러를
 * useMemo/useCallback 의존성에 넣어도 매 렌더 무효화되지 않도록.
 */
export const useToast = () => {
  const [state, setState] = useState({ open: false, text: "" });

  const show = useCallback(
    (text: string) => setState({ open: true, text }),
    [],
  );
  const close = useCallback(
    () => setState((prev) => ({ ...prev, open: false })),
    [],
  );

  return { open: state.open, text: state.text, show, close };
};
