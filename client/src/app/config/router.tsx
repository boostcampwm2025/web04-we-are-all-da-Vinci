import { lazy, Suspense } from 'react';
import { PATHS } from '@/shared/config';
import type { RouteObject } from 'react-router-dom';
import Home from '@/pages/home/Home';
import AppLayout from '@/app/ui/AppLayout';
import { Loading } from '@/shared/ui';

const Game = lazy(() => import('@/pages/game/Game'));

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
        element: (
          <Suspense fallback={<Loading />}>
            <Game />
          </Suspense>
        ),
      },
    ],
  },
];
