import type { AuthLoginStage } from "@/shared/lib";

export type LoginFailureKind = AuthLoginStage | "bridge_missing";

/** 로그인 실패 단계별 안내 문구. 전부 해요체이며 재시도 버튼과 함께 노출된다. */
export const LOGIN_FAILURE_MESSAGES: Record<LoginFailureKind, string> = {
  app_login:
    "토스 로그인이 끝나지 않았어요. 아래 버튼을 눌러 다시 시도해 주세요.",
  token_issue: "로그인 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
  response_schema: "로그인 응답이 올바르지 않아요. 잠시 후 다시 시도해 주세요.",
  bridge_missing: "토스 앱에서 열면 로그인할 수 있어요.",
};
