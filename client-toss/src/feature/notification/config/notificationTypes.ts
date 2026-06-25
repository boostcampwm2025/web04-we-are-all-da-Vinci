import { serverTossApi } from "@/shared/api";
import type {
  NotificationAgreementRequest,
  NotificationAgreementResponse,
} from "@toss/shared";

export type NotificationTypeId =
  | "dailyPrompt"
  | "overtaken"
  | "attendanceStreak";

// 알림 타입 1개의 모든 가변 정보를 모은 단일 소스. 시트·오토프롬프트가 공유한다.
// 새 알림 타입은 여기 한 곳에만 추가하면 토글·자동노출·동의 흐름에 모두 반영된다.
export type NotificationTypeConfig = {
  id: NotificationTypeId;
  templateCode: string | undefined;
  label: string;
  rowTop: string;
  rowBottom: string;
  get: () => Promise<NotificationAgreementResponse>;
  save: (
    body: NotificationAgreementRequest,
  ) => Promise<NotificationAgreementResponse>;
};

export const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  {
    id: "dailyPrompt",
    templateCode: import.meta.env.VITE_TOSS_TEMPLATE_DAILY_PROMPT?.trim(),
    label: "오늘의 그림",
    rowTop: "오늘의 그림 알림",
    rowBottom: "매일 새 그림이 바뀌면 알려드려요",
    get: serverTossApi.getDailyPromptNotificationAgreement,
    save: serverTossApi.saveDailyPromptNotificationAgreement,
  },
  {
    id: "overtaken",
    templateCode: import.meta.env.VITE_TOSS_TEMPLATE_OVERTAKEN?.trim(),
    label: "랭킹 추월",
    rowTop: "랭킹 추월 알림",
    rowBottom: "TOP100 내 랭킹 변동이 있을 때 알려드려요",
    get: serverTossApi.getOvertakenNotificationAgreement,
    save: serverTossApi.saveOvertakenNotificationAgreement,
  },
  {
    id: "attendanceStreak",
    templateCode: import.meta.env.VITE_TOSS_TEMPLATE_ATTENDANCE_STREAK?.trim(),
    label: "연속 출석",
    rowTop: "연속 출석 알림",
    rowBottom: "토스포인트를 챙기도록 도와드려요",
    get: serverTossApi.getAttendanceStreakNotificationAgreement,
    save: serverTossApi.saveAttendanceStreakNotificationAgreement,
  },
];

// templateCode(env)가 설정된 타입만 노출. 미설정 타입은 토글·자동노출에서 제외된다.
export const ENABLED_NOTIFICATION_TYPES = NOTIFICATION_TYPES.filter(
  (type) => !!type.templateCode,
);
