import type { ReactNode } from "react";
import { usePlayChance } from "../hooks/usePlayChance";
import { PlayChanceContext } from "./playChanceContext";

/**
 * `usePlayChance` 인스턴스를 1개만 만들어 컨텍스트로 공유한다.
 * 전역 공유 시트(`ShareSheet`)와 레이아웃 하위 뷰가 같은 그리기 기회 상태를
 * 바라보도록 하기 위함 — 친구 초대 적립 후 잔여 기회가 즉시 갱신된다.
 */
const PlayChanceProvider = ({ children }: { children: ReactNode }) => {
  const playChance = usePlayChance();

  return (
    <PlayChanceContext.Provider value={playChance}>
      {children}
    </PlayChanceContext.Provider>
  );
};

export default PlayChanceProvider;
