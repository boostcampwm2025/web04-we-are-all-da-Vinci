import { useEffect, useState } from 'react';

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const matchMedia = window.matchMedia(query);
    const callback = (e: MediaQueryListEvent) => setMatches(e.matches);
    matchMedia.addEventListener('change', callback);
    return () => matchMedia.removeEventListener('change', callback);
  }, [query]);

  return matches;
};
