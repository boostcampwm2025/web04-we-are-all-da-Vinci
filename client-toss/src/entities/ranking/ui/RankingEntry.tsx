import { ListRow } from "@toss/tds-mobile";
import {
  DEFAULT_RANK_COLOR,
  MY_RANK_HIGHLIGHT,
  PODIUM_RANK_COLORS,
} from "../config/rankingStyles";

interface RankingEntryProps {
  name: string;
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
      className="flex items-center justify-center w-[40px] h-[40px] min-w-[40px] rounded-[100px] text-[15px] font-bold opacity-100 rotate-0"
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
  name,
  drawingId,
  score,
  rank,
  isMe,
}: RankingEntryProps) => {
  return (
    <ListRow
      id={`${drawingId}`}
      left={<RankingIcon rank={rank} isMe={isMe} />}
      contents={
        <ListRow.Texts type="2RowTypeA" top={name} bottom={score + "점"} />
      }
      arrowType="right"
    />
  );
};
