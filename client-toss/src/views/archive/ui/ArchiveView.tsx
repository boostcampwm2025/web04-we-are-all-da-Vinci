import { PhaseHeader } from "@/entities/phaseHeader";
import { Button, ListHeader } from "@toss/tds-mobile";
import { Link } from "react-router-dom";

const ArchiveView = () => {
  return (
    <div
      data-no-safe-area-bottom
      className="min-h-0 flex-1 overflow-y-auto bg-(--color-page) pb-[env(safe-area-inset-bottom)]"
    >
      <PhaseHeader
        title="내 그림 아카이브"
        description="어제까지 그린 그림을 모아봤어요"
      />

      <section className="px-(--page-px)">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-(--radius-inner) bg-(--color-card) px-4 py-3">
            <div className="text-xs text-(--color-grey)">그린 날</div>
            <div className="mt-1 text-xl font-bold text-(--color-black)">
              0일
            </div>
          </div>
          <div className="rounded-(--radius-inner) bg-(--color-card) px-4 py-3">
            <div className="text-xs text-(--color-grey)">최고 점수</div>
            <div className="mt-1 text-xl font-bold text-(--color-black)">-</div>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <ListHeader
          title={
            <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
              날짜별 기록
            </ListHeader.TitleParagraph>
          }
          description={
            <ListHeader.DescriptionParagraph>
              오늘 그림은 내일부터 볼 수 있어요
            </ListHeader.DescriptionParagraph>
          }
          descriptionPosition="bottom"
        />

        <div className="px-(--page-px)">
          <div className="flex h-44 w-full items-center justify-center rounded-(--radius-inner) bg-(--color-card) text-sm text-(--color-grey)">
            아직 아카이브 기록이 없어요
          </div>
        </div>
      </section>

      <div className="mt-6 px-(--page-px)">
        <Link to="/">
          <Button variant="weak" display="block" size="large">
            오늘 그림 보러가기
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ArchiveView;
