import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const useRequiredState = <T>(): T | null => {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state) navigate("/", { replace: true });
  }, [state, navigate]);

  return (state as T) ?? null;
};

export { useRequiredState };
