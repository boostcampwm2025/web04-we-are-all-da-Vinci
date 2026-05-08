import { getDeviceId } from "@apps-in-toss/web-framework";

// 토스 SDK getDeviceId의 string/object 반환과 throw 가능성을 흡수해 항상 string을 반환한다.
// 비-토스 환경(브라우저 dev, 미지원 버전)에서는 "local"로 폴백.
export const getAnonymousHash = async (): Promise<string> => {
  try {
    const result = (await getDeviceId()) as unknown as
      | { deviceId?: string }
      | string;
    return typeof result === "string" ? result : (result?.deviceId ?? "local");
  } catch {
    return "local";
  }
};
