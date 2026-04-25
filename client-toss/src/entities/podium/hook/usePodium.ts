import { serverTossApi } from "@/shared/api";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PodiumEntry } from "../model/types";

export const usePodium = () => {
  const [podium, setPodium] = useState<PodiumEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const controllerRef = useRef<AbortController | null>(null);

  const loadPodium = useCallback(() => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);
    setPodium(null);
    void serverTossApi
      .getPodium({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        setPodium(data);
        setIsLoading(false);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setPodium(null);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadPodium();

    return () => {
      controllerRef.current?.abort();
    };
  }, [loadPodium]);

  return {
    podium,
    isLoading,
  };
};
