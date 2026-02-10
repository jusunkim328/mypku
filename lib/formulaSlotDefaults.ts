export const ALL_SLOTS = ["morning", "noon", "evening", "bedtime"] as const;
export type SlotName = (typeof ALL_SLOTS)[number];

export const DEFAULT_SLOT_TIMES: Record<string, string> = {
  morning: "08:00",
  noon: "12:00",
  evening: "18:00",
  bedtime: "21:00",
};

export const SLOT_ICONS: Record<string, string> = {
  morning: "☀️",
  noon: "🌤️",
  evening: "🌙",
  bedtime: "🌚",
};

export function getSlotTime(
  slot: string,
  slotTimes?: Record<string, string>
): string {
  return slotTimes?.[slot] ?? DEFAULT_SLOT_TIMES[slot] ?? "12:00";
}

export function sortSlots(slots: string[]): string[] {
  return [...slots].sort(
    (a, b) =>
      ALL_SLOTS.indexOf(a as SlotName) - ALL_SLOTS.indexOf(b as SlotName)
  );
}
