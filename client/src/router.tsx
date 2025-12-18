import type { RouteObject } from 'react-router-dom';
import { PATHS } from '@/constants/paths';
import LandingPage from '@/pages/Landingpage';
import CreateRoom from '@/pages/CreateRoom';
import WaitingRoom from '@/pages/WaitingRoom';
import GameStart from '@/pages/GameStart';
import DrawingGame from '@/pages/DrawingGame';
import FinalResults from '@/pages/FinalResult';

export const routes: RouteObject[] = [
  {
    path: PATHS.HOME,
    element: <LandingPage />,
  },
  {
    path: PATHS.CREATE_ROOM,
    element: <CreateRoom />,
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
    element: <FinalResults />,
  },
];
