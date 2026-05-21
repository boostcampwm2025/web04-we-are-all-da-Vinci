import { createContext, useContext } from "react";
import type { usePlayChance } from "../hooks/usePlayChance";

type PlayChanceContextValue = ReturnType<typeof usePlayChance>;

const PlayChanceContext = createContext<PlayChanceContextValue | null>(null);

const usePlayChanceContext = (): PlayChanceContextValue => {
  const context = useContext(PlayChanceContext);
  if (context === null) {
    throw new Error(
      "usePlayChanceContext는 PlayChanceProvider 안에서 사용해야 해요.",
    );
  }
  return context;
};

export { PlayChanceContext, usePlayChanceContext };
export type { PlayChanceContextValue };
