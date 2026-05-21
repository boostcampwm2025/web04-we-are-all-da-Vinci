import type { MyRankingResponse } from "@/entities/ranking";
import { serverTossApi } from "@/shared/api";
import { getTossShareLink, share } from "@apps-in-toss/web-framework";
import { buildShareMessageWithRanking } from "../config/shareMessage";

const SHARE_LINK =
  "intoss://we-are-all-da-vinci?utm_source=share&utm_medium=organic";
const SHARE_IMAGE = "https://imgur.com/JUlHwsT.png";

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

/**
 * 토스 공유 링크에 내 점수·랭킹을 담아 OS 네이티브 공유 시트를 연다.
 * `share()`는 공유 완료 여부를 돌려주지 않으므로 이 경로로는 보상을 줄 수 없다.
 */
const shareMyScore = async (): Promise<void> => {
  let myRanking: MyRankingResponse | null = null;
  try {
    myRanking = await serverTossApi.getMyRanking();
  } catch {
    // 점수 조회 실패해도 링크는 공유되도록 폴백
  }

  const tossLink = await getTossShareLink(SHARE_LINK, SHARE_IMAGE);
  await share({ message: buildShareMessage(tossLink, myRanking) });
};

export { shareMyScore };
