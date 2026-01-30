import { useLayoutEffect, useRef, useState } from 'react';
import { calculateCardSize } from '../lib/gridLayout';

export const useResponsiveCardSize = (cols: number, rows: number) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const newSize = calculateCardSize(width, height, cols, rows);
        setCardSize(newSize);
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [cols, rows]);

  return { containerRef, cardSize };
};
