import { VolumeIcon } from './VolumeIcon';
import { useVolumeControl } from '../model/useVolumeControl';

export const VolumeController = () => {
  const { sfxVolume, bgmVolume, handleSFXVolumeChange, handleBGMVolumeChange } =
    useVolumeControl();

  return (
    <div className="scribble-border scribble-border-box w-[260px] rounded-3xl bg-white/90 p-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <VolumeIcon
              muted={sfxVolume === 0}
              size={24}
              className="text-gray-700"
            />
            <span className="font-handwriting text-xl font-medium text-gray-700">
              효과음
            </span>
          </div>

          <input
            type="range"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-500"
            name="sfxVolume"
            id="sfxVolume"
            aria-label="효과음 볼륨:"
            value={sfxVolume}
            min={0}
            max={100}
            step={1}
            onChange={handleSFXVolumeChange}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <VolumeIcon
              muted={bgmVolume === 0}
              size={24}
              className="text-gray-700"
            />
            <span className="font-handwriting text-xl font-medium text-gray-700">
              배경음
            </span>
          </div>

          <input
            type="range"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-500"
            name="bgmVolume"
            id="bgmVolume"
            aria-label="배경음 볼륨"
            value={bgmVolume}
            min={0}
            max={100}
            step={1}
            onChange={handleBGMVolumeChange}
          />
        </div>
      </div>
    </div>
  );
};
