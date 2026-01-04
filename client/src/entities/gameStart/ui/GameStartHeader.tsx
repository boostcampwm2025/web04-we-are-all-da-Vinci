import type { ReactNode } from 'react';

interface GameStartHeaderProps {
  roundBadge: ReactNode;
  title: string;
}

export function GameStartHeader({ roundBadge, title }: GameStartHeaderProps) {
  return (
    <div className="mb-4 shrink-0 text-center">
      {roundBadge}
      <h1 className="font-handwriting mb-1 text-3xl font-black md:text-4xl">
        {title}
      </h1>
      <div className="mx-auto mt-1 h-1.5 w-40 rounded-full bg-yellow-300" />
    </div>
  );
}
