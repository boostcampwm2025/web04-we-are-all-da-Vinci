import { useEffect, useState } from 'react';

export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const matchMedia = window.matchMedia(query);
    if (matchMedia.matches !== matches) setMatches(matchMedia.matches);

    const callback = () => setMatches(matchMedia.matches);
    matchMedia.addEventListener('change', callback);
    return () => matchMedia.removeEventListener('change', callback);
  }, [matches, query]);

  return matches;
};
