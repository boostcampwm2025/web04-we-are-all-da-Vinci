import { PATHS } from '@/shared/config';
import type { RouteObject } from 'react-router-dom';
import Game from '@/pages/game/Game';
import Home from '@/pages/home/Home';
import AppLayout from '@/app/ui/appLayout';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      {
        path: PATHS.HOME,
        element: <Home />,
      },
      {
        path: `${PATHS.GAME}/:roomId`,
        element: <Game />,
      },
    ],
  },
];
