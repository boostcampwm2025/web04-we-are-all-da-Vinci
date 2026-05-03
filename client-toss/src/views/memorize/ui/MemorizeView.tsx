import { PhaseHeader } from "@/entities/phaseHeader";
import { useRequirePlaySession } from "@/feature/playChance";
import { BannerAd } from "@/shared/ui/bannerAd";

const MemorizeView = () => {
  const { isCheckingSession } = useRequirePlaySession();

  if (isCheckingSession) return null;

  return (
    <div className="flex h-full flex-col bg-white pb-0!">
      <PhaseHeader
        title="기억하세요!"
        description="10초 동안 그림을 기억하세요"
        progress={0.5}
      />

      {/* 스크롤 영역 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 제시 이미지 */}
        <div className="mx-(--card-mx) mt-2 rounded-2xl bg-gray-100 p-3">
          <img
            src="https://placehold.co/400x400"
            alt="제시 그림"
            className="w-full rounded-xl bg-white object-contain shadow-sm"
          />
        </div>

        <BannerAd type="feed" adGroupId="ait-ad-test-native-image-id" />
      </div>
    </div>
  );
};

export default MemorizeView;
