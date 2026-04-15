import { appLogin } from "@apps-in-toss/web-framework";
import { useNavigate } from "react-router-dom";
import { useBottomSheet } from "@toss/tds-mobile";
import { useState } from "react";
import { getAgreementModalContent } from "../ui/AgreementModal";

export const useLoginFlow = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { openOneButtonSheet } = useBottomSheet();

  const handleLogin = async () => {
    if (isLoading) return;

    const modalContent = getAgreementModalContent();

    const agreed = await openOneButtonSheet(modalContent);

    if (!agreed) return;

    setIsLoading(true);
    try {
      const { authorizationCode, referrer } = await appLogin();
      // TODO: authorizationCode와 referrer를 server-toss로 전달해 세션 발급
      console.log("로그인 성공", { authorizationCode, referrer });
      navigate("/");
    } catch {
      // 사용자가 로그인을 취소하거나 오류 발생 시 아무것도 하지 않음
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleLogin,
    isLoading,
  };
};
