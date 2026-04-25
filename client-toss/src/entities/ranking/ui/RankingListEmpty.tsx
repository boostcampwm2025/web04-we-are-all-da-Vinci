import { Paragraph } from "@toss/tds-mobile";

const RankingListEmpty = () => {
  return (
    <div className="flex w-full items-center justify-center px-(--page-px) py-6 text-center">
      <Paragraph typography="t6" className="flex flex-col items-center ">
        <Paragraph.Text
          fontWeight="semibold"
          typography="t5"
        >{`아직 아무도 그림을 제출하지 않았어요\n`}</Paragraph.Text>
        <Paragraph.Text>첫 번째 플레이어가 되어보세요!</Paragraph.Text>
      </Paragraph>
    </div>
  );
};

export default RankingListEmpty;
