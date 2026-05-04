import {
  closeView,
  graniteEvent,
  setIosSwipeGestureEnabled,
} from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";

const useExitGuard = () => {
  const [showDialog, setShowDialog] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setIosSwipeGestureEnabled({ isEnabled: false });

    const unsub = graniteEvent.addEventListener("backEvent", {
      onEvent: () => setShowDialog(true),
      onError: console.error,
    });
    unsubRef.current = unsub;

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
      setIosSwipeGestureEnabled({ isEnabled: true });
    };
  }, []);

  const exit = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    closeView().catch((err) => console.error("미니앱 종료 실패:", err));
  }, []);

  return { showDialog, setShowDialog, exit };
};

export { useExitGuard };
