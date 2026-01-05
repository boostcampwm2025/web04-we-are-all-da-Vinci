import type { RouteObject } from 'react-router-dom';
import { PATHS } from '@/shared/config';
import LandingPage from '@/pages/main/Landingpage';

import { Game } from '@/pages/game';

export const routes: RouteObject[] = [
  {
    path: PATHS.HOME,
    element: <LandingPage />,
  },
  {
    path: PATHS.GAME,
    element: <Game />,
  },
];
