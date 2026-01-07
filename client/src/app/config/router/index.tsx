import type { RouteObject } from 'react-router-dom';
import { PATHS } from '@/shared/config';

import { Game } from '@/pages/game';
import Main from '@/pages/main/Main';

export const routes: RouteObject[] = [
  {
    path: PATHS.HOME,
    element: <Main />,
  },
  {
    path: PATHS.GAME,
    element: <Game />,
  },
];
