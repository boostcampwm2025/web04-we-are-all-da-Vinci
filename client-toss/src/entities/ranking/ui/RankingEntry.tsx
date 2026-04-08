import { ListRow } from "@toss/tds-mobile";

interface RankingEntryProps {
  userId: number;
  name: string;
  drawingId: number;
  totalSimilarity: number;
  rank: number;
}

const podiumColor = ["#FFD158", "#D1D6DB", "#EE8F11"];

const RankingIcon = ({ rank }: { rank: number }) => {
  const bgColor = rank <= 3 ? podiumColor[rank - 1] : "#F2F4F6";

  return (
    <span
      className="flex items-center justify-center w-[40px] h-[40px] min-w-[40px] rounded-[100px] text-[15px] font-bold opacity-100 rotate-0"
      style={{
        backgroundColor: bgColor,
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
  return (
    <ListRow
      left={<RankingIcon rank={rank} />}
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
