import { selectPhase, useGameStore } from '@/entities/gameRoom/model';
import { useGameSocket } from '@/features/socket/model';
import { Drawing, GameEnd, Prompt, RoundReplay, RoundStanding, Waiting } from '@/widgets';

const GAME_PHASE_COMPONENT_MAP = {
  WAITING: Waiting,
  DRAWING: Drawing,
  PROMPT: Prompt,
  ROUND_REPLAY: RoundReplay,
  ROUND_STANDING: RoundStanding,
  GAME_END: GameEnd,
} as const;

const Game = () => {
  useGameSocket();
  const phase = useGameStore(selectPhase);
  const PhaseComponent = GAME_PHASE_COMPONENT_MAP[phase];

  return <PhaseComponent />;
};

export default Game;
