import { VolumeController } from './VolumeController';

interface VolumeControlModalProps {
  isOpen: boolean;
}

export const VolumeControlModal = ({ isOpen }: VolumeControlModalProps) => {
  return (
    <div className="relative">
      {isOpen && (
        <div
          className="absolute top-full left-0 mb-2 md:top-auto md:bottom-full"
          onClick={(e) => e.stopPropagation()}
        >
          <VolumeController />
        </div>
      )}
    </div>
  );
};
