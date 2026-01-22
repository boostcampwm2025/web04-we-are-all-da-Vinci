import { useRef } from 'react';
import type { PlayerScore } from '@/entities/roundResult/model/types';

// 리스트 순서가 바뀔 때 DOM 위치 변화만을 이용해
// 자연스러운 이동 애니메이션을 만들기 위한 FLIP 애니메이션 훅
export const useFlipAnimation = () => {
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const setRowRef = (key: string) => (el: HTMLDivElement | null) => {
    if (el) {
      rowRefs.current.set(key, el);
    } else {
      rowRefs.current.delete(key);
    }
  };

  // FLIP 애니메이션 실행 함수
  // onUpdate: 실제 상태 업데이트(setState)
  // next: 업데이트될 다음 데이터 순서
  const playFlip = (
    onUpdate: (next: PlayerScore[]) => void,
    next: PlayerScore[],
  ) => {
    const prevRects = new Map<string, DOMRect>();

    rowRefs.current.forEach((el, id) => {
      prevRects.set(id, el.getBoundingClientRect());
    });

    onUpdate(next);

    requestAnimationFrame(() => {
      rowRefs.current.forEach((el, id) => {
        const prev = prevRects.get(id);
        if (!prev) return;

        const dy = prev.top - el.getBoundingClientRect().top;
        if (dy === 0) return;

        el.style.transform = `translateY(${dy}px)`;
        el.style.transition = 'transform 0s';

        requestAnimationFrame(() => {
          el.style.transform = '';
          el.style.transition =
            'transform 700ms cubic-bezier(0.34,1.56,0.64,1)';
        });
      });
    });
  };

  return { setRowRef, playFlip };
};
