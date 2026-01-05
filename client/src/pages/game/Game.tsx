import { Waiting, Drawing, RoundEnd, GameEnd } from '@/widgets';

// import { useState } from 'react';

// type GamePhase = 'WAITING' | 'DRAWING' | 'ROUND_END' | 'GAME_END';

const GAME_PHASE_COMPONENT_MAP = {
  WAITING: Waiting,
  DRAWING: Drawing,
  ROUND_END: RoundEnd,
  GAME_END: GameEnd,
} as const;

const Game = () => {
  //   const [gamePhase, setGamePhase] = useState<GamePhase>('WAITING');

  const gamePhase = 'ROUND_END';
  const PhaseComponent = GAME_PHASE_COMPONENT_MAP[gamePhase];

  return <PhaseComponent />;
};

export default Game;
