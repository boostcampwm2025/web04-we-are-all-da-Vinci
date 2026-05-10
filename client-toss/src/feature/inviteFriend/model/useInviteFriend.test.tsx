/// <reference types="@testing-library/jest-dom/vitest" />
import { serverTossApi } from "@/shared/api";
import { contactsViral } from "@apps-in-toss/web-framework";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInviteFriend } from "./useInviteFriend";

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    chargeChanceByShare: vi.fn(),
  },
}));

describe("useInviteFriend", () => {
  const mockedContactsViral = contactsViral as unknown as ReturnType<
    typeof vi.fn
  > & {
    isSupported: ReturnType<typeof vi.fn>;
  };
  const mockedCharge =
    serverTossApi.chargeChanceByShare as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedCharge.mockResolvedValue({ count: 2 });
  });

  describe("contactsViral 미지원 또는 moduleId 미설정", () => {
    it("contactsViral.isSupported false면 onError 호출 + start 차단", async () => {
      mockedContactsViral.isSupported.mockReturnValue(false);
      const onCharged = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useInviteFriend({ onCharged, onError }),
      );

      await act(async () => {
        result.current.start();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "이 환경에서는 친구 초대 적립이 지원되지 않아요.",
        }),
      );
      expect(mockedContactsViral).not.toHaveBeenCalled();
      expect(onCharged).not.toHaveBeenCalled();
      expect(result.current.isInviting).toBe(false);
    });
  });

  describe("contactsViral 지원 + moduleId 환경변수", () => {
    beforeEach(() => {
      mockedContactsViral.isSupported.mockReturnValue(true);
      // @ts-expect-error: 테스트에서 환경변수 주입
      import.meta.env.VITE_CONTACTS_VIRAL_MODULE_ID = "test-module";
    });

    afterEach(() => {
      // 다른 워커/테스트로 환경변수가 새지 않도록 정리
      // @ts-expect-error: 테스트 종료 후 환경변수 제거
      delete import.meta.env.VITE_CONTACTS_VIRAL_MODULE_ID;
    });

    it("sendViral 이벤트 발생 시 chargeChanceByShare로 channel:'contactsViral' 적립", async () => {
      let capturedOnEvent:
        | ((event: {
            type: string;
            data: { rewardAmount: number; rewardUnit: string };
          }) => void)
        | undefined;
      mockedContactsViral.mockImplementation(
        ({
          onEvent,
        }: {
          onEvent: (event: {
            type: string;
            data: { rewardAmount: number; rewardUnit: string };
          }) => void;
        }) => {
          capturedOnEvent = onEvent;
          return vi.fn();
        },
      );

      const onCharged = vi.fn();
      const { result } = renderHook(() => useInviteFriend({ onCharged }));

      await act(async () => {
        result.current.start();
      });

      expect(mockedContactsViral).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { moduleId: "test-module" },
        }),
      );

      await act(async () => {
        capturedOnEvent?.({
          type: "sendViral",
          data: { rewardAmount: 1, rewardUnit: "그리기 기회" },
        });
      });

      await waitFor(() => {
        expect(mockedCharge).toHaveBeenCalledWith({
          channel: "contactsViral",
          moduleId: "test-module",
          rewardAmount: 1,
          rewardUnit: "그리기 기회",
        });
        expect(onCharged).toHaveBeenCalledWith(2);
      });
    });
  });
});
