import { TITLES } from '@/shared/config';
import { RoundBadge, Title } from '@/shared/ui';

interface GameHeaderProps {
  title: string;
  round?: number;
  description?: string;
  showDecoration?: boolean;
  showLogo?: boolean;
}

export const GameHeader = ({
  title,
  round,
  description,
  showDecoration = false,
  showLogo = true,
}: GameHeaderProps) => {
  return (
    <header className="mb-4 flex w-full shrink-0 items-center justify-between">
      {/* 왼쪽 로고 */}
      <div className="flex flex-1 items-center justify-start pl-8">
        {showLogo && (
          <div className="hidden flex-col items-center xl:flex">
            <Title title={TITLES.MAIN} fontSize="text-5xl" />
          </div>
        )}
      </div>

      {/* 중앙 타이틀 */}
      <div className="flex flex-2 flex-col items-center justify-center text-center">
        {round !== undefined && <RoundBadge round={round} />}

        <div className="mb-2">
          <h1 className="font-handwriting text-5xl font-black md:text-6xl">
            {title}
          </h1>
        </div>

        {description && (
          <p className="font-handwriting text-content-secondary hidden text-xl xl:inline">
            {description}
          </p>
        )}

        {showDecoration && (
          <div className="mx-auto h-1.5 w-48 rounded-full bg-yellow-300" />
        )}
      </div>

      {/* 오른쪽 비율을 맞추기 위한 공간 */}
      <div className="flex flex-1" />
    </header>
  );
};
