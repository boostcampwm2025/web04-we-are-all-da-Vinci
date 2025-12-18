export function getCorsOrigins(envValue?: string): string[] {
  if (!envValue) return [];
  return envValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
