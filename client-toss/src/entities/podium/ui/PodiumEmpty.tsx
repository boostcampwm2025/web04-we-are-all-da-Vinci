import { Paragraph } from "@toss/tds-mobile";
import {
  PODIUM_EMPTY_MESSAGE_MAIN,
  PODIUM_EMPTY_MESSAGE_SUB,
} from "../config/constants";

const PodiumEmpty = () => {
  return (
    <div className="flex flex-col w-full items-center justify-center px-(--page-px) py-6 text-center">
      <Paragraph typography="t5" fontWeight="semibold">
        <Paragraph.Text>{PODIUM_EMPTY_MESSAGE_MAIN}</Paragraph.Text>
      </Paragraph>
      <Paragraph typography="t6">
        <Paragraph.Text>{PODIUM_EMPTY_MESSAGE_SUB}</Paragraph.Text>
      </Paragraph>
    </div>
  );
};

export default PodiumEmpty;
