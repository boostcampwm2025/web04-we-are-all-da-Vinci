import { PhaseHeader } from "@/entities/phaseHeader";
import { BannerAd } from "@/shared/ui/bannerAd";

const MemorizeView = () => {
  return (
    <div className="flex h-full flex-col bg-white">
      <PhaseHeader
        title="기억하세요!"
        description="10초 동안 그림을 기억하세요"
        progress={0.5}
      />

      {/* 제시 이미지 영역 */}
      <div className="mx-[var(--card-mx)] mt-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
        <img
          src="https://placehold.co/400x400"
          alt="제시 그림"
          className="h-full w-full object-contain"
        />
      </div>

      <BannerAd adGroupId="ait-ad-test-banner-id" />
    </div>
  );
};

export default MemorizeView;
