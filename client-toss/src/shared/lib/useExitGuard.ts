import {
  graniteEvent,
  setIosSwipeGestureEnabled,
} from "@apps-in-toss/web-framework";
import { useEffect, useState } from "react";

const useExitGuard = () => {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    setIosSwipeGestureEnabled({ isEnabled: false });

    const unsub = graniteEvent.addEventListener("backEvent", {
      onEvent: () => setShowDialog(true),
      onError: console.error,
    });

    return () => {
      unsub();
      setIosSwipeGestureEnabled({ isEnabled: true });
    };
  }, []);

  return { showDialog, setShowDialog };
};

export { useExitGuard };
