import { TableRow } from "@toss/tds-mobile";

interface MyRankingProps {
  nickname?: string;
  rank: number;
  score: number;
}

const MyRanking = ({ nickname, rank, score }: MyRankingProps) => {
  return (
    <div className="pointer-events-none bg-(--color-page) select-none">
      <TableRow
        align="space-between"
        left={nickname ? `${nickname}의 순위` : "내 순위"}
        right={
          <span className="text-base">
            <strong>{rank}위</strong>
            <span className="ml-2 text-(--color-grey)">{score}점</span>
          </span>
        }
      />
    </div>
  );
};

export default MyRanking;
