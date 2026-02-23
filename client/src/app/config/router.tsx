import { lazy, Suspense } from 'react';
import { PATHS } from '@/shared/config';
import type { RouteObject } from 'react-router-dom';
import Home from '@/pages/home/Home';
import AppLayout from '@/app/ui/AppLayout';
import { GameLoadingSkeleton } from '@/widgets/game/ui/GameLoadingSkeleton';
import { ErrorBoundary } from '@/shared/ui';

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
          <ErrorBoundary>
            <Suspense fallback={<GameLoadingSkeleton />}>
              <Game />
            </Suspense>
          </ErrorBoundary>
        ),
      },
    ],
  },
];
