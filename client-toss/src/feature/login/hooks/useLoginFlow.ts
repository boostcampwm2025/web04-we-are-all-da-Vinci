import { appLogin } from "@apps-in-toss/web-framework";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { serverTossApi } from "@/shared/api";

export const useLoginFlow = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("userKey")) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const { authorizationCode, referrer } = await appLogin();
      const { userKey } = await serverTossApi.login({
        authorizationCode,
        referrer,
      });
      localStorage.setItem("userKey", String(userKey));
    } catch (err) {
      console.error("[login error]", err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleLogin,
    isLoading,
  };
};
