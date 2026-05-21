import {
  getTossShareLink,
  partner,
  share,
  tdsEvent,
} from "@apps-in-toss/web-framework";
import { useEffect } from "react";
import { serverTossApi } from "@/shared/api";
import type { MyRankingResponse } from "@/entities/ranking";
import { buildShareMessageWithRanking } from "../config/shareMessage";

const buildShareMessage = (
  tossLink: string,
  myRanking: MyRankingResponse | null,
): string => {
  if (myRanking?.state === "FOUND") {
    const { score, rank } = myRanking.ranking;
    return buildShareMessageWithRanking(score, rank, tossLink);
  }
  return tossLink;
};

const handleShare = async () => {
  let myRanking: MyRankingResponse | null = null;
  try {
    myRanking = await serverTossApi.getMyRanking();
  } catch {
    // 점수 조회 실패해도 링크는 공유되도록 폴백
  }

  const tossLink = await getTossShareLink(
    "intoss://we-are-all-da-vinci?utm_source=share&utm_medium=organic",
    "https://imgur.com/JUlHwsT.png",
  );

  await share({ message: buildShareMessage(tossLink, myRanking) });
};

const useShareButton = () => {
  useEffect(() => {
    partner.addAccessoryButton({
      id: "share",
      title: "공유",
      icon: {
        name: "icon-share-dots-thin-mono",
      },
    });

    const cleanup = tdsEvent.addEventListener("navigationAccessoryEvent", {
      onEvent: async ({ id }) => {
        if (id === "share") {
          try {
            await handleShare();
          } catch (error) {
            console.error(error);
          }
        }
      },
    });

    return cleanup;
  }, []);
};

export default useShareButton;
