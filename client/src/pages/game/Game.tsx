import { selectPhase, useGameStore } from '@/entities/gameRoom/model';
import { useGameSocket } from '@/features/socket/model';
import { OverlayModal } from '@/shared/ui';
import { Drawing, GameEnd, Prompt, RoundEnd, Waiting } from '@/widgets';
import { useNavigate } from 'react-router-dom';

const GAME_PHASE_COMPONENT_MAP = {
  WAITING: Waiting,
  DRAWING: Drawing,
  PROMPT: Prompt,
  ROUND_END: RoundEnd,
  GAME_END: GameEnd,
} as const;

const Game = () => {
  const navigate = useNavigate();
  useGameSocket();
  const phase = useGameStore(selectPhase);
  const alertMessage = useGameStore((state) => state.alertMessage);
  const setAlertMessage = useGameStore((state) => state.setAlertMessage);
  const pendingNavigation = useGameStore((state) => state.pendingNavigation);
  const setPendingNavigation = useGameStore(
    (state) => state.setPendingNavigation,
  );
  const PhaseComponent = GAME_PHASE_COMPONENT_MAP[phase];

  const handleAlertConfirm = () => {
    setAlertMessage(null);
    if (pendingNavigation) {
      setPendingNavigation(null);
      navigate(pendingNavigation);
    }
  };

  const handleAlertClose = () => {
    setAlertMessage(null);
    if (pendingNavigation) {
      setPendingNavigation(null);
      navigate(pendingNavigation);
    }
  };

  return (
    <>
      <PhaseComponent />
      <OverlayModal
        isOpen={!!alertMessage}
        onClose={handleAlertClose}
        title="알림"
        message={alertMessage ?? ''}
        onConfirm={handleAlertConfirm}
      />
    </>
  );
};

export default Game;
