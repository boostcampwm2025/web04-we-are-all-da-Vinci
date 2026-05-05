import { useEffect, useRef, useState } from "react";

const calcRemaining = (endTime: number) =>
  Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

const useCountdown = (
  endTime: number,
  totalSeconds: number,
  onComplete: () => void,
) => {
  const [timeLeft, setTimeLeft] = useState(() => calcRemaining(endTime));
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    setTimeLeft(calcRemaining(endTime));
  }, [endTime]);

  useEffect(() => {
    const remaining = calcRemaining(endTime);
    if (completedRef.current) return;

    if (remaining <= 0) {
      completedRef.current = true;
      onCompleteRef.current();
      return;
    }

    const tick = () => {
      const r = calcRemaining(endTime);
      setTimeLeft(r);
      if (r <= 0 && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const progress = totalSeconds > 0 ? 1 - timeLeft / totalSeconds : 1;

  return { timeLeft, progress };
};

export const MEMORIZE_SECONDS = 10;
export const DRAWING_SECONDS = 30;

export { useCountdown };
