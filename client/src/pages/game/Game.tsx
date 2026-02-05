import { selectPhase, useGameStore } from '@/entities/gameRoom';
import { useGameSocket } from '@/features/socket';
import { OverlayModal } from '@/shared/ui';
import { Drawing } from '@/widgets/drawing';
import { Prompt } from '@/widgets/prompt';
import { RoundReplay } from '@/widgets/roundReplay';
import { RoundStanding } from '@/widgets/roundStanding';
import { GameEnd } from '@/widgets/gameEnd';
import type { Phase } from '@/shared/config';
import { Waiting } from '@/widgets/waiting';
import { useNavigate } from 'react-router-dom';
import { GameLoadingSkeleton } from '@/widgets/game/ui/GameLoadingSkeleton';

const GAME_PHASE_COMPONENT_MAP: Record<Phase, React.FC> = {
  WAITING: Waiting,
  DRAWING: Drawing,
  PROMPT: Prompt,
  ROUND_REPLAY: RoundReplay,
  ROUND_STANDING: RoundStanding,
  GAME_END: GameEnd,
};

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

  /* 
    새로고침 시 스토어 데이터가 초기화되어 phase가 'WAITING'(기본값)으로 잡히는 문제를 방지합니다.
    roomId가 없다는 것은 아직 소켓으로부터 방 정보를 받지 못했다는 뜻이므로,
    그 동안은 로컬 스토리지 기반의 스켈레톤을 보여줍니다.
  */
  const roomId = useGameStore((state) => state.roomId);

  if (!roomId) {
    return (
      <>
        <GameLoadingSkeleton />
        <OverlayModal
          isOpen={!!alertMessage}
          onClose={handleAlertClose}
          title="알림"
          message={alertMessage ?? ''}
          onConfirm={handleAlertConfirm}
        />
      </>
    );
  }

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
