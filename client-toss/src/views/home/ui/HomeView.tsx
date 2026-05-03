import { Button } from "@toss/tds-mobile";
import { Link } from "react-router-dom";
import { useLoginFlow } from "@/feature/login";

const HomeView = () => {
  const { handleLogout } = useLoginFlow();
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
      <Link to="/login">
        <Button size="large" display="block">
          로그인 페이지로 이동
        </Button>
      </Link>

      <Link to="/ranking">
        <Button size="large" display="block">
          랭킹 화면으로 이동
        </Button>
      </Link>

      <Link to="/dashboard">
        <Button size="large" display="block">
          대시보드 화면으로 이동
        </Button>
      </Link>
      <Button size="large" display="block" onClick={handleLogout}>
        로그아웃 (토큰 삭제)
      </Button>
    </div>
  );
};

export default HomeView;
