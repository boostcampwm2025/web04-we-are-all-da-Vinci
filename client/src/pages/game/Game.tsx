import { selectPhase, useGameStore } from '@/entities/gameRoom/model';
import { useGameSocket } from '@/features/socket/model';
import { OverlayModal } from '@/shared/ui';
import { Drawing, GameEnd, Prompt, RoundEnd, Waiting } from '@/widgets';

const GAME_PHASE_COMPONENT_MAP = {
  WAITING: Waiting,
  DRAWING: Drawing,
  PROMPT: Prompt,
  ROUND_END: RoundEnd,
  GAME_END: GameEnd,
} as const;

const Game = () => {
  useGameSocket();
  const phase = useGameStore(selectPhase);
  const alertMessage = useGameStore((state) => state.alertMessage);
  const setAlertMessage = useGameStore((state) => state.setAlertMessage);
  const PhaseComponent = GAME_PHASE_COMPONENT_MAP[phase];

  return (
    <>
      <PhaseComponent />
      <OverlayModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        title="알림"
        message={alertMessage ?? ''}
        onConfirm={() => setAlertMessage(null)}
      />
    </>
  );
};

export default Game;
