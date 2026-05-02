import { BottomCTA } from "@toss/tds-mobile";
import type { ComponentProps, ComponentType } from "react";

type BottomCTAButtonProps = ComponentProps<typeof BottomCTA.Single> & {
  onClick?: () => void;
  loading?: boolean;
};

const BottomCTAButton = BottomCTA.Single as ComponentType<BottomCTAButtonProps>;

export default BottomCTAButton;
