import { Phase, Player } from 'src/core/game.types';
import { RoomSettingsDto } from './room-settings.dto';

export class RoomMetadata {
  roomId: string;
  players: Player[];
  phase: Phase;
  currentRound: number;
  settings: Omit<RoomSettingsDto, 'roomId'>;
}
