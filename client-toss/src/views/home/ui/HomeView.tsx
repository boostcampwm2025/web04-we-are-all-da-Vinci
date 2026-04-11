import { Button } from "@toss/tds-mobile";
import { Link } from "react-router-dom";

const HomeView = () => {
  return (
    <div className="flex-1 px-(--page-px) pt-4">
      <h1>홈</h1>
      <Link to="/drawing">
        <Button size="large" display="block">
          드로잉 페이지로 이동
        </Button>
      </Link>
      <Link to="/memorize">
        <Button size="large" display="block">
          기억하기 페이지로 이동
        </Button>
      </Link>
      <Link to="/submitted">
        <Button size="large" display="block">
          제출 완료 화면으로 이동
        </Button>
      </Link>

      <Link to="/ranking">
        <button>랭킹 화면으로 이동</button>
      </Link>

      <Link to="/dashboard">
        <button>대시보드 화면으로 이동</button>
      </Link>
    </div>
  );
};
export default HomeView;
