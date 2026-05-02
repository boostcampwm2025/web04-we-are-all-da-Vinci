const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const getTodayKst = (now: Date = new Date()): Date => {
  const kstMs = now.getTime() + KST_OFFSET_MS;
  const kst = new Date(kstMs);
  return new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()),
  );
};
