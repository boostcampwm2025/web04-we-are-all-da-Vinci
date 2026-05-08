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
          void playChance.refresh();
        }}
      />
    </>
  );
};

export default PlayChanceLayout;
