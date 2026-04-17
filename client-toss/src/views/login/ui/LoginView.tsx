import { logoImg } from "@/shared/assets/images";
import { BottomCTA, Paragraph, Top } from "@toss/tds-mobile";
import type { ComponentType, ComponentProps } from "react";
import { useLoginFlow } from "@/feature/login";
import { STEPS } from "../config/steps";

const BottomCTAButton = BottomCTA.Single as ComponentType<
  ComponentProps<typeof BottomCTA.Single> & { onClick?: () => void; loading?: boolean }
>;

const LoginView = () => {
  const { handleLogin, isLoading } = useLoginFlow();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-between py-2">
        <Top
          className="p-4 gap-6"
          upper={
            <Top.UpperAssetContent
              content={
                <img
                  alt="우리 모두 다빈치"
                  src={logoImg}
                  className="h-19 w-19 rounded-[14px]"
                />
              }
            />
          }
          title={
            <Top.TitleParagraph size={28}>
              우리 모두 다빈치에서
              <br />
              토스로 로그인할까요?
            </Top.TitleParagraph>
          }
        />

        <div className="flex flex-col px-(--page-px) gap-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex items-start gap-4 min-h-20">
              <div className="flex flex-col items-center self-stretch">
                <img
                  src={step.icon}
                  alt={step.alt}
                  className="size-7.5 shrink-0 object-contain"
                />
                {index < STEPS.length && (
                  <div className="w-0.5 h-8 bg-gray-300 mt-2" />
                )}
              </div>

              <div className="flex flex-col gap-2 items-start justify-center">
                <Paragraph.Text
                  typography="t4"
                  fontWeight="bold"
                  color="rgba(0,12,30,0.8)"
                >
                  {step.title}
                </Paragraph.Text>
                <Paragraph.Text color="rgba(0,19,43,0.58)">
                  {step.description}
                </Paragraph.Text>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomCTAButton
        onClick={() => handleLogin()}
        loading={isLoading}
        disabled={isLoading}
        background="default"
      >
        다음
      </BottomCTAButton>
    </div>
  );
};

export default LoginView;
