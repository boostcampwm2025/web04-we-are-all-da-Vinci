import { useToast } from "@/shared/lib";
import { NavItemButton, navIconUrl } from "@/shared/ui/bottomNav";
import { Toast } from "@toss/tds-mobile";
import { match } from "ts-pattern";
import { useStartGame } from "../hooks/useStartGame";

/**
 * 하단바 중앙의 테스트 시작 항목(펜 아이콘). 기회가 있으면 바로 도전을 시작하고(아이콘 위에 남은 횟수 배지),
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

    match(result.reason)
      .with("ad_not_ready", () =>
        toast.show("광고를 준비 중이에요. 잠시 후 다시 눌러주세요."),
      )
      .with("no_prompt", () => toast.show("오늘 그림이 준비되지 않았어요."))
      .with("error", () =>
        toast.show("일시적 오류가 발생했어요. 다시 시도해주세요."),
      )
      .exhaustive();
  };

  return (
    <>
      <NavItemButton
        iconUrl={navIconUrl("icon-pen-mono")}
        label="테스트 시작"
        disabled={isStarting}
        onClick={handlePress}
        badge={
          chanceCount > 0 ? (
            <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full! bg-(--color-red) px-1 text-[10px] leading-none font-bold text-white">
              {chanceCount}
            </span>
          ) : undefined
        }
      />

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
