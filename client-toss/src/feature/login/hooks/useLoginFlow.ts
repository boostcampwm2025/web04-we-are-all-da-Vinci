import { appLogin } from "@apps-in-toss/web-framework";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { serverTossApi } from "@/shared/api";

export const useLoginFlow = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const { authorizationCode, referrer } = await appLogin();
      const { accessToken } = await serverTossApi.login({
        authorizationCode,
        referrer,
      });
      localStorage.setItem("access_token", accessToken);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("[login error]", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await serverTossApi.logout();
    } catch (err) {
      console.error("[logout error]", err);
    } finally {
      localStorage.removeItem("access_token");
      navigate("/login", { replace: true });
    }
  };

  return {
    handleLogin,
    handleLogout,
    isLoading,
  };
};
