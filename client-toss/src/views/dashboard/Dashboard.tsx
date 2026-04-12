import { DailyPodium } from "@/entities/podium/ui/DailyPodium";
import { ArcScoreBar } from "@/shared/ui/arcScoreBar/ArcScoreBar";

export const Dashboard = () => {
  const rankings = [
    { userId: 1, name: "김동권", totalSimilarity: 99.54 },
    { userId: 2, name: "엄청나게긴긴이름입니다", totalSimilarity: 80.01 },
    { userId: 3, name: "조천산", totalSimilarity: 58.8 },
  ];
  return (
    <>
      <DailyPodium entries={rankings} />
      <ArcScoreBar />
    </>
  );
};
