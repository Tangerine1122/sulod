/** Date helpers. Everything is stored in UTC and shown in Asia/Manila (UTC+8, no DST). */

export const APP_TZ = "Asia/Manila";
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** The calendar day in Manila for an instant: { y, m (1-12), d, weekday (0 = Sunday) }. */
export function manilaParts(instant: Date) {
  const shifted = new Date(instant.getTime() + MANILA_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

/** The UTC instant of 00:00 Manila time on the given Manila calendar day. */
export function manilaMidnight(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d) - MANILA_OFFSET_MS);
}

/** Start (Monday 00:00 Manila) and end (next Monday) of the week containing `now`. */
export function manilaWeekRange(now: Date, weeksBack = 0): { from: Date; to: Date } {
  const { y, m, d, weekday } = manilaParts(now);
  const daysSinceMonday = (weekday + 6) % 7;
  const from = manilaMidnight(y, m, d - daysSinceMonday - 7 * weeksBack);
  const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { from, to };
}

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const weekdayName = (i: number) => weekdayNames[i] ?? "";

export function formatManila(instant: Date | string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-PH", { timeZone: APP_TZ, ...opts }).format(new Date(instant));
}

/** "Good morning" / "Good afternoon" / "Good evening" by Manila hour. */
export function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ, hour: "2-digit", hour12: false }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
