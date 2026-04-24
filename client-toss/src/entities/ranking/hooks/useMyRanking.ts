import { serverTossApi } from "@/shared/api";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MyRankingResponse } from "@/entities/ranking";

export const useMyRanking = () => {
  const [myRanking, setMyRanking] = useState<MyRankingResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const controllerRef = useRef<AbortController | null>(null);

  const loadMyRanking = useCallback(() => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);

    serverTossApi
      .getMyRanking({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        setMyRanking(data);
        setIsLoading(false);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("내 랭킹 조회 실패", error);
        setMyRanking(null);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadMyRanking();

    return () => {
      controllerRef.current?.abort();
    };
  }, [loadMyRanking]);

  return { myRanking, isLoading };
};
