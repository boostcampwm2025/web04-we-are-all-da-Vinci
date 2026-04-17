import { appLogin } from "@apps-in-toss/web-framework";
import { useState } from "react";
import { serverTossApi } from "@/shared/api";

export const useLoginFlow = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (onSuccess?: () => void) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const { authorizationCode, referrer } = await appLogin();
      const { userKey } = await serverTossApi.login({
        authorizationCode,
        referrer,
      });
      localStorage.setItem("userKey", String(userKey));
      onSuccess?.();
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
