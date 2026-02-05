import { useEffect } from 'react';

/**
 * 게임 페이지에서 새로고침/창닫기 시 확인 대화상자를 표시하는 훅
 * 메인 페이지를 제외한 모든 게임 페이지에서 사용
 */
export const useBeforeUnload = () => {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome에서는 returnValue 설정이 필요
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
};
