import { useEffect } from 'react';
import { Main } from '@/widgets/main';
import { markHomePageRendered } from '@/shared/lib/mixpanel/earlyExitTracking';

const Home = () => {
  useEffect(() => {
    // React는 브라우저 paint 완료 후 useEffect를 실행하므로,
    // 이 시점이 사용자가 실제로 홈 화면을 본 순간임
    markHomePageRendered();
  }, []);

  return <Main />;
};

export default Home;
