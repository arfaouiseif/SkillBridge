// "18:30" -> 1110 (minutes since midnight)
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// 1110 -> "18:30"
export function toHHMM(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Tunisia is UTC+1 all year (no daylight saving)
export const TUNIS_OFFSET_MINUTES = 60;

// Weekday (1 = Monday ... 7 = Sunday) and minute of the day, in Tunisia time
export function toTunisTime(date: Date): { weekday: number; minuteOfDay: number } {
  const local = new Date(date.getTime() + TUNIS_OFFSET_MINUTES * 60 * 1000);
  const day = local.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  return {
    weekday: day === 0 ? 7 : day,
    minuteOfDay: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}