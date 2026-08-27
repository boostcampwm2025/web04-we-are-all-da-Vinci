import { useToast } from "@/shared/lib";
import { NavItemButton, navIconUrl } from "@/shared/ui/bottomNav";
import { Toast } from "@toss/tds-mobile";
import { useStartGame } from "../hooks/useStartGame";

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
