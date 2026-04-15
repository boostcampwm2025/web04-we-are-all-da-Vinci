import { BottomSheet, ListRow, Paragraph } from "@toss/tds-mobile";
import { AGREEMENTS } from "../config/agreements";

export const getAgreementModalContent = () => ({
  header: (
    <>
      <BottomSheet.Header>
        우리 모두 다빈치 로그인을 위해 꼭 필요한 동의만 추렸어요
      </BottomSheet.Header>
      <BottomSheet.HeaderDescription>
        동의하고 시작하면 바로 게임을 즐길 수 있어요.
      </BottomSheet.HeaderDescription>
    </>
  ),
  children: (
    <div className="space-y-1">
      {AGREEMENTS.map((agreement) => (
        <ListRow
          key={agreement.title}
          left={
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3182f620]">
              <div className="h-2.5 w-2.5 rounded-full bg-[#3182f6]" />
            </div>
          }
          contents={
            <div className="flex flex-col gap-0.5">
              <Paragraph.Text fontWeight="bold" color="rgba(11,18,33,1)">
                {agreement.title}
              </Paragraph.Text>
              <Paragraph.Text color="rgba(0,19,43,0.58)">
                {agreement.description}
              </Paragraph.Text>
            </div>
          }
        />
      ))}
    </div>
  ),
  button: "동의하고 시작하기",
  closeOnButtonClick: true,
});
