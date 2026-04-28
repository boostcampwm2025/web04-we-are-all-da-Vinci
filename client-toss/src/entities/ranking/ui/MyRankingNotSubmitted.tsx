import { Button } from "@toss/tds-mobile";
import { Link } from "react-router-dom";
import { NOT_SUBMITTED_MESSAGE } from "../config/constants";

const MyRankingNotSubmitted = () => {
  return (
    <div className="h-42 flex flex-col items-center justify-center px-(--page-px) text-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="text-#03183275 text-xs font-[400]">내 등수</div>
        <div className="text-lg font-[700] text-[#031228]">
          {NOT_SUBMITTED_MESSAGE}
        </div>
        <Link to="/">
          <Button
            size="large"
            variant="weak"
            display="block"
            aria-label="그림 그리러 가기"
          >
            그림 그리러 가기
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default MyRankingNotSubmitted;
