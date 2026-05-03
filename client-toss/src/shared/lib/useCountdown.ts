import { useCallback, useEffect, useRef, useState } from "react";

const useCountdown = (seconds: number, onComplete: () => void) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onCompleteRef.current();
      return;
    }

    const id = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(id);
  }, [timeLeft]);

  const progress = seconds > 0 ? (seconds - timeLeft) / seconds : 1;

  const reset = useCallback(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  return { timeLeft, progress, reset };
};

export const MEMORIZE_SECONDS = 10;
export const DRAWING_SECONDS = 30;

export { useCountdown };
