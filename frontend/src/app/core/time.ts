import type { AvailabilityWindow } from './models/api.models';

// Contract v1: all times are in Tunisia time (UTC+1, no daylight saving).
// A "wall" timestamp is a number whose UTC fields are the Tunisia clock fields,
// so we never depend on the time zone of the user's browser.
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const TUNIS_OFFSET = 60 * MIN;

const WEEKDAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const WEEKDAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export interface CalendarDay {
  wall: number; // midnight, Tunisia clock
  iso: string; // YYYY-MM-DD
  weekday: number; // 1 = Monday ... 7 = Sunday
  label: string; // "Mer 11"
  long: string; // "Mercredi 11 novembre"
  short: string; // "11 nov."
}

export interface Slot {
  time: string; // "14:00"
  iso: string; // "2026-11-11T14:00:00+01:00", sent to the API
  startMs: number;
  endMs: number;
  dayLong: string;
}

export interface BusyRange {
  startMs: number;
  endMs: number;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** The Tunisia calendar day `offsetDays` after today. */
export function tunisDay(offsetDays: number, nowMs = Date.now()): CalendarDay {
  const wallNow = nowMs + TUNIS_OFFSET;
  const wall = wallNow - (wallNow % DAY) + offsetDays * DAY;
  const d = new Date(wall);
  const dow = d.getUTCDay();
  const date = d.getUTCDate();
  const month = d.getUTCMonth();
  const long = `${WEEKDAYS_LONG[dow]} ${date} ${MONTHS_LONG[month]}`;
  return {
    wall,
    iso: d.toISOString().slice(0, 10),
    weekday: dow || 7,
    label: `${WEEKDAYS_SHORT[dow]} ${date}`,
    long: long.charAt(0).toUpperCase() + long.slice(1),
    short: `${date} ${MONTHS_SHORT[month]}`,
  };
}

/** Bookable start times of one day: on the hour or half hour, fully inside a window, in the future, not overlapping a busy range. */
export function buildSlots(
  day: CalendarDay,
  windows: AvailabilityWindow[],
  durationMin: number,
  busy: BusyRange[],
  nowMs = Date.now(),
): Slot[] {
  const slots = new Map<number, Slot>();

  for (const w of windows) {
    if (w.weekday !== day.weekday) continue;
    const end = toMinutes(w.endTime);

    for (let t = Math.ceil(toMinutes(w.startTime) / 30) * 30; t + durationMin <= end; t += 30) {
      const startMs = day.wall + t * MIN - TUNIS_OFFSET;
      const endMs = startMs + durationMin * MIN;
      if (startMs <= nowMs) continue;
      if (busy.some((b) => startMs < b.endMs && endMs > b.startMs)) continue;

      const time = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
      slots.set(startMs, { time, iso: `${day.iso}T${time}:00+01:00`, startMs, endMs, dayLong: day.long });
    }
  }

  return [...slots.values()].sort((a, b) => a.startMs - b.startMs);
}

export const DURATIONS: { value: 30 | 60 | 90 | 120; label: string }[] = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 heure' },
  { value: 90, label: '1 h 30' },
  { value: 120, label: '2 heures' },
];


/** Day and time range of a session, in Tunisia time. */
export function formatSessionTime(startIso: string, endIso: string) {
  const start = new Date(new Date(startIso).getTime() + TUNIS_OFFSET);
  const end = new Date(new Date(endIso).getTime() + TUNIS_OFFSET);
  const hm = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return {
    day: `${WEEKDAYS_SHORT[start.getUTCDay()]} ${start.getUTCDate()} ${MONTHS_SHORT[start.getUTCMonth()]}`,
    range: `${hm(start)} – ${hm(end)}`,
  };
}

/** Day and clock time of an instant, in Tunisia time. */
export function formatInstant(iso: string) {
  const d = new Date(new Date(iso).getTime() + TUNIS_OFFSET);
  return {
    dayKey: d.toISOString().slice(0, 10),
    day: `${WEEKDAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}