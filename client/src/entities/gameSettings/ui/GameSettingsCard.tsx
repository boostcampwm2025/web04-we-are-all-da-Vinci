import { SettingItem } from './SettingItem';
import type { RoomSettings } from '@/features/roomSettings';

interface GameSettingsCardProps {
  settings: RoomSettings;
}

export function GameSettingsCard({ settings }: GameSettingsCardProps) {
  return (
    <div className="rounded-2xl border-2 border-gray-800 bg-yellow-50 p-5 shadow-lg">
      <h3 className="font-handwriting mb-5 text-center text-2xl font-bold">
        게임 설정
      </h3>
      <div className="space-y-4">
        <SettingItem
          icon="group"
          label="최대 인원"
          value={`${settings.players}명`}
        />
        <SettingItem
          icon="replay"
          label="라운드"
          value={`${settings.rounds} 라운드`}
        />
        <SettingItem
          icon="schedule"
          label="그리기 시간"
          value={`${settings.timeLimit}초`}
        />
        <SettingItem icon="draw" label="주제" value="랜덤" />
      </div>
    </div>
  );
}
