import { serverTossApi } from "@/shared/api";
import { formatLocalDate, getAnonymousHash } from "@/shared/lib";
import type { AttendanceCheckInResponse } from "@toss/shared";
import { useEffect, useRef, useState } from "react";

/**
 * 대시보드가 실제로 보일 때(게임 자동시작으로 넘어가지 않는 진입) 자동으로 출석을 체크인한다.
 * - 게임 자동시작과 충돌하지 않도록 `enabled`(=대시보드 노출)일 때만 동작한다.
 *   첫 접근에 게임으로 navigate하는 경우엔 enabled=false라 체크인하지 않고, 게임을 다녀와
 *   대시보드가 보이거나 이미 플레이한 날 재진입했을 때 체크인·시트가 뜬다.
 * - `localStorage[attendance_${hash}]` 게이트로 기기-당일 중복 호출을 막되, 정확성은 서버 멱등이 보장한다.
 * - 게이트는 **체크인 성공 후에만** 기록한다(실패 시 다음 진입에 재시도 가능).
 * - 결과가 `already`가 아니면(=오늘 첫 체크인) 결과 시트를 띄우도록 `result`로 올린다.
 */
interface UseAttendanceAutoCheckInParams {
  /** 대시보드가 실제로 노출되는 진입일 때만 true(게임 자동시작 진입에서는 false). */
  enabled?: boolean;
  /** 체크인 성공 직후 호출 — 현황(getStatus)을 갱신해 카드를 최신 상태로 맞춘다. */
  onChecked?: () => void;
}

export const useAttendanceAutoCheckIn = ({
  enabled = true,
  onChecked,
}: UseAttendanceAutoCheckInParams = {}) => {
  const [result, setResult] = useState<AttendanceCheckInResponse | null>(null);
  // 체크인 처리(성공·실패·스킵)가 끝났는지 — 알림 시트 등 후속 노출을 출석 시트 뒤로 미루는 데 쓴다.
  const [settled, setSettled] = useState(false);
  const checkedRef = useRef(false);
  const onCheckedRef = useRef(onChecked);
  onCheckedRef.current = onChecked;

  useEffect(() => {
    if (!enabled) return;

    const run = async () => {
      try {
        const hash = await getAnonymousHash();
        const today = formatLocalDate();
        const gateKey = `attendance_${hash}`;

        if (localStorage.getItem(gateKey) === today) return;
        // effect가 두 번 실행돼도 마운트당 1회만 호출
        if (checkedRef.current) return;
        checkedRef.current = true;

        const res = await serverTossApi.checkInAttendance();
        localStorage.setItem(gateKey, today);
        onCheckedRef.current?.();
        if (res.status !== "already") setResult(res);
      } catch {
        // 실패 시 게이트를 닫지 않아 다음 진입에 재시도된다.
      } finally {
        setSettled(true);
      }
    };

    run();
  }, [enabled]);

  const close = () => setResult(null);

  return { result, settled, close };
};
