/**
 * 대기방 진입 시 로딩 화면용 스켈레톤 UI
 * 실제 Waiting 컴포넌트의 레이아웃 구조와 정확히 일치하도록 설계
 */

import { Title } from '@/shared/ui';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 ${className}`}
  />
);

/** 플레이어 카드 스켈레톤 - 실제 PlayerCard 스타일: border-2, p-2 xl:p-6 */
const PlayerCardSkeleton = () => (
  <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-gray-50 p-2 text-center xl:p-6">
    {/* UserAvatar: h-6 w-6 md:h-10 md:w-10 xl:h-14 xl:w-14 */}
    <Skeleton className="h-6 w-6 rounded-full md:h-10 md:w-10 xl:h-14 xl:w-14" />
    {/* 닉네임: mt-1 xl:mt-2, text-[10px] sm:text-base lg:text-lg */}
    <Skeleton className="mt-1 h-2.5 w-8 sm:h-4 sm:w-10 lg:h-5 lg:w-12 xl:mt-2" />
    {/* 상태: text-base sm:text-lg lg:text-xl - 대기방에서는 "대기중" 표시 */}
    <Skeleton className="mt-1 h-3 w-6 sm:h-4 sm:w-8 lg:h-5 lg:w-10" />
  </div>
);

/** 빈 슬롯 스켈레톤 - 실제 SlotCard 스타일: border-2 border-dashed, p-2 sm:p-4 lg:p-6 */
const SlotCardSkeleton = () => (
  <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-2 text-center sm:p-4 lg:p-6">
    {/* 아이콘 원: h-6 w-6 md:h-10 md:w-10 xl:h-14 xl:w-14 */}
    <div className="mx-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 md:h-10 md:w-10 xl:h-14 xl:w-14" />
    {/* 라벨: text-base sm:text-lg lg:text-xl */}
    <Skeleton className="mt-1 h-3 w-6 sm:h-4 sm:w-8 lg:h-5 lg:w-10 xl:mt-2" />
  </div>
);

export const WaitingSkeleton = () => {
  return (
    <>
      <div className="page-center">
        <main className="game-container md:mx-10 xl:mx-25">
          {/* GameHeader 스켈레톤 - 실제: mb-4, flex justify-between */}
          <header className="mb-4 flex w-full shrink-0 items-center justify-between">
            {/* 왼쪽 로고: flex-1, pl-8, xl에서만 표시 */}
            <div className="flex flex-1 items-center justify-start pl-8">
              <div className="hidden flex-col items-center xl:flex">
                <Title title="우리 모두 다빈치" fontSize="text-5xl" />
              </div>
            </div>

            {/* 중앙 타이틀: flex-2 */}
            <div className="flex flex-2 flex-col items-center justify-center text-center">
              {/* 타이틀: text-4xl md:text-6xl */}
              <div className="mb-2">
                <h1 className="font-handwriting text-4xl font-black md:text-6xl">
                  게임방
                </h1>
              </div>
              {/* description: xl에서만 표시 */}
              <p className="font-handwriting text-content-secondary hidden text-xl xl:inline">
                친구들이 모일 때까지 기다려주세요!
              </p>
            </div>

            {/* 오른쪽 빈 공간: flex-1 */}
            <div className="flex flex-1" />
          </header>

          {/* 메인 컨텐츠: gap-4 xl:gap-7 */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto md:flex-row md:overflow-visible xl:gap-7">
            {/* 왼쪽: PlayerListSection + WaitingRoomActions */}
            <section className="flex flex-col gap-4 md:h-full md:flex-1">
              <div className="flex min-h-0 flex-col gap-4 md:h-full">
                {/* PlayerListSection: card, h-87.5 md:h-full, p-6 */}
                <div className="relative min-h-0 md:flex-1">
                  <div className="card flex h-87.5 flex-col p-6 md:h-full">
                    {/* 헤더: mb-5, flex justify-between */}
                    <div className="mb-5 flex shrink-0 items-center justify-between">
                      {/* 인원 타이틀: text-lg md:text-2xl + (X/Y) */}
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-8 md:h-7 md:w-10" />
                        <Skeleton className="h-4 w-10 md:h-5 md:w-14" />
                      </div>
                      {/* RoomCodeCopy: rounded-lg, px-2 py-1 md:px-4 md:py-2 */}
                      <Skeleton className="h-8 w-36 rounded-lg md:h-10 md:w-48" />
                    </div>

                    {/* 플레이어 그리드: grid-cols-4, gap-2 md:gap-4, auto-rows-fr */}
                    <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-4 content-start gap-2 overflow-y-auto md:gap-4">
                      {/* 첫 번째 플레이어 (방장) */}
                      <PlayerCardSkeleton />
                      {/* 나머지 빈 슬롯 7개 */}
                      {[...Array(7)].map((_, i) => (
                        <SlotCardSkeleton key={i} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* WaitingRoomActions: gap-2 md:gap-4 */}
                <div className="flex gap-2 md:gap-4">
                  {/* 설정 버튼 (모바일 전용): w-12 */}
                  <div className="flex-none md:hidden">
                    <Skeleton className="h-12 w-12 rounded-full" />
                  </div>
                  {/* 나가기 버튼: flex-1 */}
                  <Skeleton className="h-12 flex-1 rounded-full" />
                  {/* 시작 버튼: flex-1 */}
                  <Skeleton className="h-12 flex-1 rounded-full" />
                </div>
              </div>
            </section>

            {/* 오른쪽: GameSettingsCard + ChatBox, w-full md:w-50 xl:w-80 */}
            <section className="flex w-full flex-col gap-4 md:w-50 xl:w-80">
              {/* GameSettingsCard: card-settings, md에서만 표시 */}
              <div className="hidden md:block">
                <div className="card-settings relative">
                  {/* 헤더: mb-5, text-2xl 중앙정렬 */}
                  <div className="relative mb-5 flex items-center justify-center">
                    <h3 className="font-handwriting text-2xl font-bold">
                      게임 설정
                    </h3>
                    <Skeleton className="absolute right-0 h-6 w-6 rounded" />
                  </div>
                  {/* 설정 항목들: flex-wrap md에서는 가로, xl에서는 세로 */}
                  <div className="flex flex-row flex-wrap justify-between gap-1 xl:flex-col xl:space-y-4">
                    <Skeleton className="h-5 w-16 xl:h-6 xl:w-full" />
                    <Skeleton className="h-5 w-20 xl:h-6 xl:w-full" />
                    <Skeleton className="h-5 w-18 xl:h-6 xl:w-full" />
                  </div>
                </div>
              </div>

              {/* ChatBox: Waiting.tsx에서 className="h-72 md:h-full" 전달 */}
              {/* 실제 결과: cn('card flex h-full flex-col', 'h-72 md:h-full') */}
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="card flex h-72 h-full flex-col md:h-full">
                  {/* 채팅 헤더 */}
                  <div className="border-stroke-strong border-b-2 px-4 py-3">
                    <h3 className="font-handwriting flex justify-center text-lg font-bold">
                      채팅
                    </h3>
                  </div>

                  {/* 메시지 리스트 */}
                  <div className="relative flex-1 overflow-hidden">
                    <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent h-full w-full overflow-y-auto p-4">
                      <div className="flex min-h-full flex-col justify-end" />
                    </div>
                  </div>

                  {/* ChatInput */}
                  <div className="border-stroke-default bg-surface-default border-t p-1">
                    <Skeleton className="h-8 w-full rounded-full" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default WaitingSkeleton;
