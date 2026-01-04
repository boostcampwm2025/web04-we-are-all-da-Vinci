import type { RouteObject } from 'react-router-dom';
import { PATHS } from '@/shared/config';
import LandingPage from '@/pages/main/Landingpage';
import WaitingRoom from '@/pages/game/WaitingRoom';
import GameStart from '@/pages/game/GameStart';
import DrawingGame from '@/pages/game/Drawing';
import RoundResults from '@/pages/game/RoundResult';

export const routes: RouteObject[] = [
  {
    path: PATHS.HOME,
    element: <LandingPage />,
  },

  {
    path: PATHS.WAITING_ROOM,
    element: <WaitingRoom />,
  },
  {
    path: PATHS.GAME_START,
    element: <GameStart />,
  },
  {
    path: PATHS.DRAWING_GAME,
    element: <DrawingGame />,
  },
  {
    path: PATHS.FINAL_RESULTS,
    element: <RoundResults />,
  },
];
