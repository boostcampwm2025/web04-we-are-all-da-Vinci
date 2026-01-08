import { PATHS } from '@/shared/config';
import type { RouteObject } from 'react-router-dom';

import Game from '@/pages/game/Game';
import Main from '@/pages/main/Main';

export const routes: RouteObject[] = [
  {
    path: PATHS.HOME,
    element: <Main />,
  },
  {
    path: `${PATHS.GAME}/:roomId`,
    element: <Game />,
  },
];
