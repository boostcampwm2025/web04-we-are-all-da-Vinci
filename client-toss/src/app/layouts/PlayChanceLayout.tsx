import { InviteFriendButton } from "@/feature/inviteFriend";
import { usePlayChance } from "@/feature/playChance";
import { Outlet } from "react-router-dom";

export type PlayChanceLayoutContext = ReturnType<typeof usePlayChance>;

const PlayChanceLayout = () => {
  const playChance = usePlayChance();

  return (
    <>
      <Outlet context={playChance satisfies PlayChanceLayoutContext} />
      <InviteFriendButton
        chanceCount={playChance.chanceCount}
        onCharged={() => {
          // refresh가 throw해도 state.error로 이미 노출됨 — unhandled rejection만 방지
          playChance.refresh().catch(() => {});
        }}
      />
    </>
  );
};

export default PlayChanceLayout;
