import type { Settings } from '@/entities/gameRoom/model';
import { SettingItem } from './SettingItem';

interface GameSettingsCardProps {
  settings: Settings;
  onEdit?: () => void;
  isHost?: boolean;
}

export const GameSettingsCard = ({
  settings,
  onEdit,
  isHost,
}: GameSettingsCardProps) => {
  return (
    <div className="card-settings relative">
      <div className="relative mb-5 flex items-center justify-center">
        <h3 className="font-handwriting text-2xl font-bold">게임 설정</h3>
        {isHost && onEdit && (
          <button
            onClick={onEdit}
            className="text-content-tertiary hover:text-content-primary absolute right-0 transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        )}
      </div>
      <div className="flex flex-row flex-wrap justify-between gap-1 xl:flex-col xl:space-y-4">
        <SettingItem
          icon="group"
          label="최대 인원"
          value={`${settings.maxPlayer}명`}
        />
        <span className="xl:hidden">/</span>
        <SettingItem
          icon="replay"
          label="라운드"
          value={`${settings.totalRounds} 라운드`}
        />
        <span className="xl:hidden">/</span>
        <SettingItem
          icon="schedule"
          label="그리기 시간"
          value={`${settings.drawingTime}초`}
        />
      </div>
    </div>
  );
};
