import { ListRow } from "@toss/tds-mobile";

interface RankingEntryProps {
  userId: number;
  name: string;
  drawingId: number;
  totalSimilarity: number;
  rank: number;
}

const podiumBgColor = ["#FFD158", "#D1D6DB", "#EE8F11"];

const RankingIcon = ({ rank, isMe }: { rank: number; isMe: boolean }) => {
  const bgColor = isMe
    ? "#3182F6"
    : rank <= 3
      ? podiumBgColor[rank - 1]
      : "#F2F4F6";

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
