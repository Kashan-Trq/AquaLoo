import type { FilterState } from "./types";

export function getFilterState(
  totalLitres: number | null | undefined,
  startTotalLitres: number,
  capacityLitres: number
): FilterState {
  if (totalLitres == null || !Number.isFinite(totalLitres) || capacityLitres <= 0) {
    return {
      key: "unknown",
      label: "Filter status unavailable",
      emoji: "⚪",
      usedPercent: 0,
      remainingPercent: 0,
      litresRemaining: 0,
    };
  }

  const usedLitres = Math.max(0, totalLitres - startTotalLitres);
  const rawUsedPercent = (usedLitres / capacityLitres) * 100;
  const usedPercent = Math.max(0, Math.min(100, rawUsedPercent));
  const remainingPercent = Math.max(0, 100 - usedPercent);
  const litresRemaining = Math.max(0, capacityLitres - usedLitres);

  if (usedPercent >= 90) {
    return {
      key: "maintenance",
      label: "Maintenance required",
      emoji: "🔴",
      usedPercent,
      remainingPercent,
      litresRemaining,
    };
  }

  if (usedPercent >= 70) {
    return {
      key: "check",
      label: "Check filter",
      emoji: "🟡",
      usedPercent,
      remainingPercent,
      litresRemaining,
    };
  }

  return {
    key: "good",
    label: "Filter is working well",
    emoji: "🟢",
    usedPercent,
    remainingPercent,
    litresRemaining,
  };
}
