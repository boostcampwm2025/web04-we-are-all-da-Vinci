import { useRef, useCallback, useLayoutEffect } from 'react';

const TRANSITION = 'transform 700ms cubic-bezier(0.34,1.56,0.64,1)';

// deltaY만큼 역방향으로 이동시켜 이전 위치처럼 보이게 하는 transform 적용
const invert = (el: HTMLElement, deltaY: number) => {
  el.style.transform = `translateY(${deltaY}px)`;
  el.style.transition = 'transform 0s';
};

// transform을 제거하며 transition으로 새 위치로 이동하는 애니메이션 실행
const play = (el: HTMLElement) => {
  requestAnimationFrame(() => {
    el.style.transform = '';
    el.style.transition = TRANSITION;
  });
};

export const useFlipAnimation = <T extends HTMLElement = HTMLDivElement>() => {
  const elementMap = useRef(new Map<string, T>()); // key로 카드 DOM을 조회하는 맵
  const prevTopMap = useRef<Map<string, number> | null>(null); // 순서 변경 직전 각 카드의 Y좌표 스냅샷

  // JSX에서 <div ref={setItemRef(key)}>로 카드 DOM을 등록하는 ref 콜백
  const setItemRef = useCallback(
    (key: string) => (el: T | null) => {
      if (el) {
        elementMap.current.set(key, el);
      } else {
        elementMap.current.delete(key);
      }
    },
    [],
  );

  // F단계 위치 스냅샷 저장 후 onUpdate 호출로 리렌더를 트리거하는 함수
  const animate = useCallback((onUpdate: () => void) => {
    const tops = new Map<string, number>();
    elementMap.current.forEach((el, key) => {
      tops.set(key, el.getBoundingClientRect().top);
    });
    prevTopMap.current = tops;
    onUpdate();
  }, []);

  // animate 호출 후 리렌더가 일어날 때마다 L+I+P 단계를 실행하는 effect
  useLayoutEffect(() => {
    if (!prevTopMap.current) return;
    const prevTops = prevTopMap.current;
    prevTopMap.current = null;

    requestAnimationFrame(() => {
      elementMap.current.forEach((el, key) => {
        const prevTop = prevTops.get(key);
        if (prevTop === undefined) return;

        const deltaY = prevTop - el.getBoundingClientRect().top; // L: 이전 Y와 현재 Y의 차이
        if (deltaY === 0) return;

        invert(el, deltaY); // I: 이전 위치처럼 보이도록 역방향 이동
        play(el); // P: transition으로 새 위치로 복귀
      });
    });
  });

  return { setItemRef, animate };
};
