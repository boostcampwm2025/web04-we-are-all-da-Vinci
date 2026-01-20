import { VolumeIcon } from './VolumeIcon';
import { useVolumeControl } from '../model/useVolumeControl';

export const VolumeController = () => {
  const { volume, handleVolumeChange } = useVolumeControl();

  return (
    <div className="scribble-border rounded-full bg-white/90 px-5 py-3">
      <div className="flex items-center gap-3">
        <VolumeIcon muted={volume === 0} size={24} className="text-gray-700" />
        <input
          type="range"
          className="h-2 w-64 cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-500"
          name="volume"
          id="volume"
          value={volume}
          min={0}
          max={100}
          step={1}
          onChange={handleVolumeChange}
        />
      </div>
    </div>
  );
};
