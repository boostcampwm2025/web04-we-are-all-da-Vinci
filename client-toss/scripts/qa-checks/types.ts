export interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  details: string[];
  /**
   * 머신리더블 부가 데이터. PR 코멘트를 만드는 쪽이 한국어 detail 문자열을
   * 파싱하지 않도록 구조화된 값을 그대로 넘긴다. 검사마다 형태가 다르다.
   */
  report?: unknown;
}

/** `--report-json` 으로 기록하는 전체 리포트. CI의 github-script가 읽는다. */
export interface QaReport {
  ciMode: boolean;
  summary: { pass: number; warn: number; fail: number };
  results: CheckResult[];
}
