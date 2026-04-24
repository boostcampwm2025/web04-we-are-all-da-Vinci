import { serverTossApi } from "@/shared/api";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RankingListItem } from "../model/types";

export const useRankingList = () => {
  const [rankingList, setRankingList] = useState<RankingListItem[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const controllerRef = useRef<AbortController | null>(null);

  const loadRankingList = useCallback(() => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);

    serverTossApi
      .getRankingList({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }
        setRankingList(data);
        setIsLoading(true);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setRankingList(null);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadRankingList();

    return () => {
      controllerRef.current?.abort();
    };
  }, [loadRankingList]);

  return {
    rankingList,
    isLoading,
  };
};
