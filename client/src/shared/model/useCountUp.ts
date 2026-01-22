import { useEffect, useState } from 'react';

//숫자를 start → end까지 지정한 시간 동안 부드럽게 증가시키는 훅
export const useCountUp = (
  start: number,
  end: number,
  duration = 1000,
  delay = 0,
) => {
  const [count, setCount] = useState(start);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCount(start);
      const startTime = Date.now(); // 애니메이션 시작 시각
      const diff = end - start; // 총 이동해야 할 값

      const animate = () => {
        const elapsed = Date.now() - startTime; // 경과 시간
        const progress = Math.min(elapsed / duration, 1); // 진행도
        const eased = 1 - (1 - progress) * (1 - progress); // easeOutQuad
        setCount(start + eased * diff);

        if (progress < 1) requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [start, end, duration, delay]);

  return count;
};
