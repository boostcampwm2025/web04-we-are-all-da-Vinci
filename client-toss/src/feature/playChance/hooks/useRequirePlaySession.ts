import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadActivePlaySession } from "../model/playSessionStorage";

export const useRequirePlaySession = () => {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    if (import.meta.env.DEV) {
      setIsCheckingSession(false);
      return;
    }

    const checkSession = async () => {
      try {
        const session = await loadActivePlaySession();
        if (!isMounted) return;

        if (session == null) {
          navigate("/", { replace: true });
          return;
        }

        setIsCheckingSession(false);
      } catch {
        if (!isMounted) return;
        navigate("/", { replace: true });
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return { isCheckingSession };
};
