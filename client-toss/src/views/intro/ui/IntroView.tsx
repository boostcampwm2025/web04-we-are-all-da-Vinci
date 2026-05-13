import { painterMan2Img } from "@/shared/assets/images";
import { useExitGuard } from "@/shared/lib";
import { Button, ConfirmDialog, Paragraph, Top } from "@toss/tds-mobile";
import { STEPS } from "../config/steps";

type IntroViewProps = {
  onStart: () => void;
};

const IntroView = ({ onStart }: IntroViewProps) => {
  const { showDialog, setShowDialog, exit } = useExitGuard();

  return (
    <div data-no-safe-area-bottom className="flex h-full flex-col">
      <div className="flex flex-1 flex-col py-2">
        <Top
          upperGap={12}
          lowerGap={0}
          title={
            <Top.TitleParagraph size={28}>
              그림을 외워서
              <br />
              똑같이 그려봐요
            </Top.TitleParagraph>
          }
          subtitleBottom={
            <Top.SubtitleParagraph size={17}>
              <Top.SubtitleParagraph.Text>
                기억하고 그려서 두뇌를 깨우는{" "}
              </Top.SubtitleParagraph.Text>
              <Top.SubtitleParagraph.Text
                fontWeight="bold"
                color="var(--color-toss-blue)"
              >
                우리 모두 다빈치
              </Top.SubtitleParagraph.Text>
            </Top.SubtitleParagraph>
          }
        />

        <div className="flex flex-1 items-center justify-center">
          <img
            src={painterMan2Img}
            alt="우리 모두 다빈치 마스코트"
            className="h-44 w-44 shrink-0 object-contain"
          />
        </div>

        <div className="flex flex-col gap-2 px-(--page-px)">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="flex items-center gap-3 rounded-xl bg-gray-100 px-3.5 py-2.5"
            >
              <img
                src={step.icon}
                alt={step.alt}
                className="size-8 shrink-0 object-contain"
              />
              <div className="flex flex-col gap-0.5">
                <Paragraph.Text
                  typography="t5"
                  fontWeight="bold"
                  color="rgba(0,12,30,0.88)"
                >
                  {step.title}
                </Paragraph.Text>
                <Paragraph.Text typography="t6" color="rgba(0,19,43,0.58)">
                  {step.description}
                </Paragraph.Text>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="shrink-0 px-(--page-px) pt-3 pb-[env(safe-area-inset-bottom)]">
        <Button color="primary" display="block" onClick={onStart}>
          시작하기
        </Button>
      </section>

      <ConfirmDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title="앱을 종료할까요?"
        description="언제든 다시 들어와서 시작할 수 있어요"
        confirmButton={
          <ConfirmDialog.ConfirmButton onClick={exit}>
            종료
          </ConfirmDialog.ConfirmButton>
        }
        cancelButton={
          <ConfirmDialog.CancelButton onClick={() => setShowDialog(false)}>
            계속 보기
          </ConfirmDialog.CancelButton>
        }
      />
    </div>
  );
};

export default IntroView;
