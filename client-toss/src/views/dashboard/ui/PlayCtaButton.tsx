import { type AdStatus } from "@/feature/playChance";
import { Button } from "@toss/tds-mobile";

interface PlayCtaButtonProps {
  isChanceLoading: boolean;
  hasChance: boolean;
  chanceCount: number;
  adStatus: AdStatus;
  isStarting: boolean;
  /** 기회로 바로 도전 */
  onStart: () => void;
  /** 광고 보고 도전 */
  onAdStart: () => void;
  /** 광고 다시 불러오기 */
  onReloadAd: () => void;
}

/**
 * 대시보드 하단 도전 CTA. 기회/광고 상태에 따라 라벨·동작이 바뀐다.
 * (ChallengeCard에 cta로 주입된다)
 */
const PlayCtaButton = ({
  isChanceLoading,
  hasChance,
  chanceCount,
  adStatus,
  isStarting,
  onStart,
  onAdStart,
  onReloadAd,
}: PlayCtaButtonProps) => {
  if (isChanceLoading) {
    return (
      <Button color="primary" display="block" loading disabled>
        도전 기회 확인 중
      </Button>
    );
  }

  if (hasChance) {
    return (
      <Button
        color="primary"
        display="block"
        loading={isStarting}
        disabled={isStarting}
        onClick={onStart}
      >
        {`광고 없이 ${chanceCount}번 도전`}
      </Button>
    );
  }

  // 잔여 기회가 없을 때의 광고 보상 버튼 — 광고 로드 상태에 따라 라벨·동작이 달라진다.
  const adButton = {
    loading: { label: "광고 준비 중이에요", onClick: undefined, busy: true },
    failed: { label: "광고 다시 불러오기", onClick: onReloadAd, busy: false },
    ready: { label: "5초 광고 보고 도전하기", onClick: onAdStart, busy: false },
  }[adStatus];

  return (
    <Button
      color="primary"
      display="block"
      loading={isStarting || adButton.busy}
      disabled={isStarting || adButton.busy}
      onClick={adButton.onClick}
    >
      {adButton.label}
    </Button>
  );
};

export default PlayCtaButton;
