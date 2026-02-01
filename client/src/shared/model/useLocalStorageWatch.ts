import { useEffect, useState } from 'react';

/**
 * localStorage 값 변경 감시 훅
 *
 * 다른 탭에서의 storage 이벤트와 같은 탭에서의 변경을 모두 감지한다.
 *
 * @param key - localStorage 키
 * @returns 현재 저장된 값 (null이면 미설정)
 */
export const useLocalStorageWatch = (key: string): string | null => {
  const [value, setValue] = useState<string | null>(() =>
    localStorage.getItem(key),
  );

  useEffect(() => {
    const checkLocalStorage = () => {
      const storedValue = localStorage.getItem(key);
      setValue(storedValue);
    };

    // storage 이벤트 리스너 (다른 탭에서 변경 시)
    globalThis.addEventListener('storage', checkLocalStorage);

    // 같은 탭에서 변경 감지를 위한 interval
    const interval = setInterval(checkLocalStorage, 100);

    return () => {
      globalThis.removeEventListener('storage', checkLocalStorage);
      clearInterval(interval);
    };
  }, [key]);

  return value;
};
