import { PATHS } from '@/constants/paths';
import { TITLES } from '@/constants/titles';

import Title from '@/components/common/Title';
import CommonBtn from '@/components/common/CommonBtn';

export default function LandingPage() {
  return (
    <>
      <div className="flex h-full w-full items-center justify-center px-4">
        <div className="flex max-w-3xl flex-col items-center justify-center text-center">
          <div className="mb-4 inline-block -rotate-1 rounded-full border-2 border-dashed border-orange-400 bg-orange-50 px-5 py-2 text-sm font-bold tracking-wide text-orange-600">
            ✨ 친구들과 함께하는 실시간 그림 퀴즈
          </div>

          <Title title={TITLES.MAIN} fontSize={'9xl'} />
          <svg
            className="w-full text-blue-400"
            fill="none"
            viewBox={`0 0 400 12`}
          >
            <path
              d="M 5 6 Q 100 2, 200 6 T 395 6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth={4}
            />
          </svg>
          <p className="font-handwriting mt-4 max-w-2xl text-xl leading-relaxed font-medium text-gray-700 md:text-2xl">
            연필로 쓱쓱, 당신의 상상력을 보여주세요!
            <br />
            링크 하나로 친구들을 초대하고 누가 최고의 화가인지 겨뤄보세요.
          </p>

          <div className="mt-10 flex w-full max-w-2xl flex-col items-center gap-4">
            <div className="flex w-full flex-col justify-center gap-4 sm:flex-row">
              <CommonBtn
                variant="scribble"
                icon="add_circle"
                text="방 만들기"
                path={PATHS.CREATE_ROOM}
              />

              <CommonBtn
                variant="scribble"
                icon="login"
                text="입장하기"
                path={PATHS.WAITING_ROOM}
              />
            </div>

            <a
              href="#"
              className="font-handwriting mt-2 cursor-pointer text-xl text-gray-600 underline decoration-gray-400 decoration-2 underline-offset-4 transition-colors hover:text-gray-800"
            >
              설명서
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
