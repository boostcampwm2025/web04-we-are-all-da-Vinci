import { Link } from "react-router-dom";

const HomeView = () => {
  return (
    <div className="flex-1 px-5 pt-4">
      <h1>홈</h1>
      <Link to="/drawing">
        <button>드로잉 페이지로 이동</button>
      </Link>
      <Link to="/memorize">
        <button>기억하기 페이지로 이동</button>
      </Link>
      <Link to="/submitted">
        <button>제출 완료 화면으로 이동</button>
      </Link>
    </div>
  );
};
export default HomeView;
