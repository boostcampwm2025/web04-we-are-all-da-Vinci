import type { NotificationAgreementStatus } from "@toss/shared";
import { ENABLED_NOTIFICATION_TYPES, type NotificationTypeId } from "../config";

export type AgreementFetchResult = {
  id: NotificationTypeId;
  status: NotificationAgreementStatus | null;
};

// 노출 대상(templateCode 설정됨) 알림 타입의 동의 상태를 병렬 조회한다.
// 개별 실패는 null로 흡수해 한 타입의 오류가 나머지를 막지 않게 한다.
// 시트(useNotificationAgreements)와 자동노출(useNotificationAutoPrompt)이 공유.
export const fetchEnabledAgreements = async (): Promise<
  AgreementFetchResult[]
> =>
  Promise.all(
    ENABLED_NOTIFICATION_TYPES.map(async (type) => ({
      id: type.id,
      status: await type
        .get()
        .then((agreement) => agreement.status)
        .catch(() => null),
    })),
  );
