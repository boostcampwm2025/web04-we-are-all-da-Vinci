/// <reference types="vite/client" />

// import.meta.env 오타를 컴파일 타임에 잡기 위한 선언 병합.
// 실제 주입 여부는 빌드 환경에 달려 있으므로 전부 optional로 둔다.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CONTACTS_VIRAL_MODULE_ID?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_TOSS_TEMPLATE_DAILY_PROMPT?: string;
  readonly VITE_TOSS_TEMPLATE_OVERTAKEN?: string;
  readonly VITE_TOSS_TEMPLATE_ATTENDANCE_STREAK?: string;
  readonly VITE_MOCK_RANKING?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_RELEASE?: string;
  /** Session Replay 전체 세션 샘플 비율(0~1). 비우면 0 — 에러 세션만 보낸다. */
  readonly VITE_SENTRY_REPLAY_SESSION_RATE?: string;
}
