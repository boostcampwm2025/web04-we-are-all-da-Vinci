import { Waiting, Drawing, RoundEnd, GameEnd, Prompt } from '@/widgets';

// import { useState } from 'react';

// type GamePhase = 'WAITING' | 'DRAWING' | 'PROMPT' | 'ROUND_END' | 'GAME_END';

const GAME_PHASE_COMPONENT_MAP = {
  WAITING: Waiting,
  DRAWING: Drawing,
  PROMPT: Prompt,
  ROUND_END: RoundEnd,
  GAME_END: GameEnd,
} as const;

const Game = () => {
  //   const [gamePhase, setGamePhase] = useState<GamePhase>('WAITING');

  const gamePhase = 'DRAWING';
  const PhaseComponent = GAME_PHASE_COMPONENT_MAP[gamePhase];

  return <PhaseComponent />;
};

export default Game;
