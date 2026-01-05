import { Drawing } from '@/widgets/drawing';
import { RoundEnd } from '@/widgets/roundEnd';
import { Waiting } from '@/widgets/waiting';
// import { useState } from 'react';

// type GamePhase = 'WAITING' | 'DRAWING' | 'ROUND_END';

const GAME_PHASE_COMPONENT_MAP = {
  WAITING: Waiting,
  DRAWING: Drawing,
  ROUND_END: RoundEnd,
  //   GAME_END: GameEnd,
} as const;

const Game = () => {
  //   const [gamePhase, setGamePhase] = useState<GamePhase>('WAITING');

  const gamePhase = 'ROUND_END';
  const PhaseComponent = GAME_PHASE_COMPONENT_MAP[gamePhase];

  return <PhaseComponent />;
};

export default Game;
