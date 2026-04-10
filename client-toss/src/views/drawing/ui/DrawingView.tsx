import { Button } from "@toss/tds-mobile";
import { PhaseHeader } from "@/entities/phaseHeader";
import { Score } from "@/shared/ui/score";
import { Toolbar, Canvas } from "@/feature/drawing";

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

      <div className="flex gap-2 px-(--page-px) pb-6">
        <Button variant="weak" size="xlarge" display="block" className="flex-1">
          그만두기
        </Button>
        <Button size="xlarge" display="block" className="flex-1">
          제출하기
        </Button>
      </div>
    </div>
  );
};
export default DrawingView;
