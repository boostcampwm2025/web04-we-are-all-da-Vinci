import { PhaseHeader } from "@/entities/phaseHeader";
import { Canvas, Toolbar } from "@/feature/drawing";
import { Score } from "@/shared/ui/score";
import { BottomCTA, CTAButton } from "@toss/tds-mobile";

const DrawingView = () => {
  return (
    <div className="flex h-full flex-col bg-white">
      <PhaseHeader
        title="그려주세요!"
        progress={0.5}
        description="30초 동안 가장 비슷하게 그려요"
      />

      {/* 드로잉 영역 (팔레트 + 캔버스) */}
      <div className="mx-(--card-mx) mt-2 flex min-h-0 flex-1 flex-col rounded-2xl bg-gray-100">
        <Toolbar />
        <Canvas />
      </div>

      {/* 점수 */}
      <div className="py-2 pt-4">
        <Score value={0} />
      </div>

      <BottomCTA.Double
        leftButton={<CTAButton variant="weak">그만두기</CTAButton>}
        rightButton={<CTAButton>제출하기</CTAButton>}
      />
    </div>
  );
};
export default DrawingView;
