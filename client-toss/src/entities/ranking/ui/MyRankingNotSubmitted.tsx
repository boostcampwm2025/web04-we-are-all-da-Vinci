const NOT_SUBMITTED_MESSAGE = "아직 오늘 그림을 제출하지 않았어요.";

export const MyRankingNotSubmitted = () => {
  return (
    <div className="h-42 flex flex-col items-center justify-center px-(--page-px) text-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="text-#03183275 text-xs font-[400]">내 등수</div>
        <div className="text-lg font-[700] text-[#031228]">
          {NOT_SUBMITTED_MESSAGE}
        </div>
      </div>
    </div>
  );
};
