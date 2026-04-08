import { ListRow } from "@toss/tds-mobile";
import {
  DEFAULT_RANK_COLOR,
  MY_RANK_HIGHLIGHT,
  PODIUM_RANK_COLORS,
} from "../config/rankingStyles";

interface RankingEntryProps {
  userId: number;
  name: string;
  drawingId: number;
  totalSimilarity: number;
  rank: number;
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
  userId,
  name,
  drawingId,
  totalSimilarity,
  rank,
}: RankingEntryProps) => {
  // 임시 데이터: 삭제 필요
  const myId = 5;
  return (
    <ListRow
      left={<RankingIcon rank={rank} isMe={myId === userId} />}
      contents={
        <ListRow.Texts
          type="2RowTypeA"
          top={name}
          bottom={totalSimilarity + "점"}
        />
      }
      arrowType="right"
    />
  );
};
