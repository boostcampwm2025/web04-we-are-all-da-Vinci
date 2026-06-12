import { logoImg } from "@/shared/assets/images";
import { useToast } from "@/shared/lib";
import { Toast } from "@toss/tds-mobile";
import { useStartGame } from "../hooks/useStartGame";

/**
 * 하단바 중앙의 돌출 원형 테스트 버튼(우리모두다빈치 로고).
 * 기회가 있으면 바로 도전을 시작하고(로고 위에 남은 횟수 배지 표시),
 * 없으면 광고를 보고 기회를 충전한 뒤 시작한다(대시보드 "광고 보고 도전하기"와 동일 흐름).
 */
const PlayNavButton = () => {
  const { hasChance, chanceCount, start, startWithAd, isStarting } =
    useStartGame();
  const toast = useToast();

  const handlePress = async () => {
    if (isStarting) return;
    const result = hasChance ? await start("nav") : await startWithAd("nav");
    if (result.ok) return;

    if (result.reason === "ad_not_ready") {
      toast.show("광고를 준비 중이에요. 잠시 후 다시 눌러주세요.");
    } else if (result.reason === "no_prompt") {
      toast.show("잠시 후 다시 시도해주세요.");
    } else {
      toast.show("일시적 오류가 발생했어요. 다시 시도해주세요.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePress}
        disabled={isStarting}
        aria-label="테스트 도전하기"
        className="absolute bottom-1 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1"
      >
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full! border-4 border-(--color-page) bg-(--color-page) shadow-md">
          <img
            src={logoImg}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
          {chanceCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full! border-2 border-(--color-page) bg-(--color-red) px-1 text-[10px] leading-none font-bold text-white">
              {chanceCount}
            </span>
          )}
        </span>
        <span
          className="text-[11px] font-medium whitespace-nowrap"
          style={{ color: "var(--color-grey)" }}
        >
          테스트 시작
        </span>
      </button>

      <Toast
        position="top"
        open={toast.open}
        text={toast.text}
        duration={2500}
        onClose={toast.close}
      />
    </>
  );
};

export default PlayNavButton;
