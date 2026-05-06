import { ListRow } from "@toss/tds-mobile";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_RANK_COLOR,
  MY_RANK_HIGHLIGHT,
  PODIUM_RANK_COLORS,
} from "../config/rankingStyles";

interface RankingEntryProps {
  nickname: string;
  drawingId: string;
  score: number;
  rank: number;
  isMe: boolean;
}

const RankingIcon = ({ rank, isMe }: { rank: number; isMe: boolean }) => {
  const bgColor = isMe
    ? MY_RANK_HIGHLIGHT
    : rank <= 3
      ? PODIUM_RANK_COLORS[rank - 1]
      : DEFAULT_RANK_COLOR;

  const textColor = isMe ? "#FFFFFF" : "#031228B2";

  return (
    <span
      className="flex h-[40px] w-[40px] min-w-[40px] rotate-0 items-center justify-center rounded-[100px] text-[15px] font-bold opacity-100"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {rank}
    </span>
  );
};

export const RankingEntry = ({
  nickname,
  drawingId,
  score,
  rank,
  isMe,
}: RankingEntryProps) => {
  const navigate = useNavigate();

  const navigateToDrawing = () => {
    navigate(`/drawing/${drawingId}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={navigateToDrawing}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          navigateToDrawing();
        }
      }}
    >
      <ListRow
        id={drawingId}
        left={<RankingIcon rank={rank} isMe={isMe} />}
        contents={
          <ListRow.Texts
            type="2RowTypeA"
            top={isMe ? `${nickname} (나)` : nickname}
            bottom={`${score.toFixed(2)}점`}
          />
        }
        arrowType="right"
      />
    </div>
  );
};
