import { useEffect, useRef } from "react";
import { trackImpression } from "@/shared/lib";

const useImpressionTracking = <T extends HTMLElement = HTMLDivElement>(
  logName: string,
  params?: Record<string, unknown>,
) => {
  const ref = useRef<T>(null);
  const logNameRef = useRef(logName);
  const paramsRef = useRef(params);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackImpression(logNameRef.current, paramsRef.current);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
};

export { useImpressionTracking };
