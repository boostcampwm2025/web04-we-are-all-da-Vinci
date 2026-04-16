import { appLogin } from "@apps-in-toss/web-framework";
import { useBottomSheet } from "@toss/tds-mobile";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { serverTossApi } from "@/shared/api";
import { getAgreementModalContent } from "../ui/AgreementModal";

export const useLoginFlow = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { openOneButtonSheet } = useBottomSheet();

  const handleLogin = async () => {
    if (isLoading) return;

    const agreed = await openOneButtonSheet(getAgreementModalContent());
    if (!agreed) return;

    setIsLoading(true);
    try {
      const { authorizationCode, referrer } = await appLogin();
      const { userKey } = await serverTossApi.login({
        authorizationCode,
        referrer,
      });
      localStorage.setItem("userKey", String(userKey));
      navigate("/");
    } catch {
      // 로그인 실패 시 로딩만 해제
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleLogin,
    isLoading,
  };
};
