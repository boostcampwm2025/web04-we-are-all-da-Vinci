import type { ReactNode } from 'react';

interface GameStartHeaderProps {
  roundBadge?: ReactNode;
  title: string;
  subtitle: string;
}

export function GameStartHeader({
  roundBadge,
  title,
  subtitle,
}: GameStartHeaderProps) {
  return (
    <div className="mb-4 shrink-0 text-center">
      {roundBadge}
      <h1 className="font-handwriting mb-1 text-3xl font-black md:text-4xl">
        {title}
      </h1>
      <p className="font-handwriting text-base text-gray-600">{subtitle}</p>
      <div className="mx-auto mt-1 h-1.5 w-40 rounded-full bg-yellow-300" />
    </div>
  );
}
