import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadActivePlaySession } from "../model/playSessionStorage";

export const useRequirePlaySession = () => {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const session = await loadActivePlaySession();
        if (!isMounted) return;

        if (session == null) {
          navigate("/dashboard", { replace: true });
          return;
        }

        setIsCheckingSession(false);
      } catch {
        if (!isMounted) return;
        navigate("/dashboard", { replace: true });
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return { isCheckingSession };
};
