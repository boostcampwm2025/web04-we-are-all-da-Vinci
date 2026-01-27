import { lazy, Suspense, useEffect } from 'react';
import { selectPhase, useGameStore } from '@/entities/gameRoom/model';
import { useGameSocket } from '@/features/socket/model';
import { Loading, OverlayModal } from '@/shared/ui';
import { useNavigate } from 'react-router-dom';
import { Waiting } from '@/widgets/waiting';

const Drawing = lazy(() =>
  import('@/widgets/drawing').then((m) => ({ default: m.Drawing })),
);
const Prompt = lazy(() =>
  import('@/widgets/prompt').then((m) => ({ default: m.Prompt })),
);
const RoundReplay = lazy(() =>
  import('@/widgets/roundReplay').then((m) => ({ default: m.RoundReplay })),
);
const RoundStanding = lazy(() =>
  import('@/widgets/roundStanding').then((m) => ({ default: m.RoundStanding })),
);
const GameEnd = lazy(() =>
  import('@/widgets/gameEnd').then((m) => ({ default: m.GameEnd })),
);

const prefetchAllPhases = () => {
  import('@/widgets/drawing');
  import('@/widgets/prompt');
  import('@/widgets/roundReplay');
  import('@/widgets/roundStanding');
  import('@/widgets/gameEnd');
};

const GAME_PHASE_COMPONENT_MAP = {
  WAITING: Waiting,
  DRAWING: Drawing,
  PROMPT: Prompt,
  ROUND_REPLAY: RoundReplay,
  ROUND_STANDING: RoundStanding,
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

  // Game 페이지 진입 시 모든 Phase를 미리 로드
  useEffect(() => {
    prefetchAllPhases();
  }, []);

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
      <Suspense fallback={<Loading />}>
        <PhaseComponent />
      </Suspense>
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
