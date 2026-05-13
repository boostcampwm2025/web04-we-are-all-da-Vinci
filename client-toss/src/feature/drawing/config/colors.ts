export type RGB = [number, number, number];

export const PALETTE_COLORS = [
  { name: "검정", hex: "#000000", rgb: [0, 0, 0] as const, ring: "ring-black" },
  {
    name: "빨강",
    hex: "#EF4444",
    rgb: [239, 68, 68] as const,
    ring: "ring-red-500",
  },
  {
    name: "파랑",
    hex: "#3B82F6",
    rgb: [59, 130, 246] as const,
    ring: "ring-blue-500",
  },
  {
    name: "초록",
    hex: "#22C55E",
    rgb: [34, 197, 94] as const,
    ring: "ring-green-500",
  },
  {
    name: "노랑",
    hex: "#FACC15",
    rgb: [250, 204, 21] as const,
    ring: "ring-yellow-400",
  },
] as const;
