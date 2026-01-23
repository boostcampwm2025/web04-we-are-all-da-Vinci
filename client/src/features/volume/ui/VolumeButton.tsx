import { useEffect, useState } from 'react';
import { VolumeIcon } from './VolumeIcon';
import { VolumeControlModal } from './VolumeControlModal';
import { useRef } from 'react';

export const VolumeButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleIconClick = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className="relative">
      <button onClick={handleIconClick}>{!isOpen && <VolumeIcon />}</button>
      <VolumeControlModal isOpen={isOpen} />
    </div>
  );
};
