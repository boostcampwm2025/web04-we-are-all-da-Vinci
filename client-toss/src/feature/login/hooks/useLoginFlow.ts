import { appLogin } from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { serverTossApi } from "@/shared/api";

const LOGIN_PENDING_KEY = "login_pending";

export const useLoginFlow = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const performLogin = useCallback(async () => {
    setIsLoading(true);
    localStorage.setItem(LOGIN_PENDING_KEY, "true");
    try {
      const { authorizationCode, referrer } = await appLogin();
      localStorage.removeItem(LOGIN_PENDING_KEY);
      const { accessToken } = await serverTossApi.login({
        authorizationCode,
        referrer,
      });
      localStorage.setItem("access_token", accessToken);
      navigate("/", { replace: true });
    } catch (err) {
      localStorage.removeItem(LOGIN_PENDING_KEY);
      console.error("[login error]", err);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      navigate("/", { replace: true });
      return;
    }
    // 약관 동의 후 WebView가 리로드되어 돌아온 경우 자동으로 로그인 재시도
    if (localStorage.getItem(LOGIN_PENDING_KEY) === "true") {
      performLogin();
    }
  }, [navigate, performLogin]);

  const handleLogin = () => {
    if (isLoading) return;
    performLogin();
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
