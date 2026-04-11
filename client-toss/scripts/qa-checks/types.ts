export interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  details: string[];
}
