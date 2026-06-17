import { logoMarkImg } from "@/shared/assets/images";
import { GHOST_TILE_LABEL } from "../config/constants";

// 참여자가 적을 때 그리드를 채우는 정적 placeholder 타일.
// 실제 그림 타일과 같은 정사각 비율이지만 점선/옅은 톤으로 빈 자리임을 드러내고,
// 가운데에 배경 없는(투명) 흑백 로고 + "도전 중" 문구만 보여준다(클릭/상세보기 없음).
const RankingGhostTile = () => {
  return (
    <div
      data-testid="ranking-ghost-tile"
      aria-hidden="true"
      className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-(--radius-inner) border border-dashed border-[#D5DAE0] bg-(--color-page)"
    >
      <img
        src={logoMarkImg}
        alt=""
        className="h-12 w-12 object-contain opacity-60 grayscale"
      />
      <span className="text-[13px] font-medium text-(--color-grey)">
        {GHOST_TILE_LABEL}
      </span>
    </div>
  );
};

export default RankingGhostTile;
