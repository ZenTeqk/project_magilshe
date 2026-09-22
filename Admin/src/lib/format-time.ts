/**
 * Formats a plain wall-clock time value (as returned by a Django TimeField,
 * e.g. "14:00:00" or "08:05") into an unambiguous 12-hour string with AM/PM,
 * e.g. "2:00 PM" / "8:05 AM". Never touches timezone/date; this is a
 * presentation-only conversion of an already-local time-of-day string.
 */
export function formatTimeOfDay(value?: string | null): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value;
  const hours24 = Number(match[1]);
  const minutes = match[2];
  if (Number.isNaN(hours24) || hours24 < 0 || hours24 > 23) return value;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

export function normalizeTimeOfDayInput(value?: string | null): string {
  const input = (value ?? "").trim();
  if (!input) return "";

  const twelveHour = /^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m?\.?$/i.exec(input);
  if (twelveHour) {
    let hours = Number(twelveHour[1] ?? "");
    const minutes = twelveHour[2] ?? "00";
    const period = (twelveHour[3] ?? "").toUpperCase();
    if (hours < 1 || hours > 12 || Number(minutes) > 59) return input;
    if (period === "P" && hours !== 12) hours += 12;
    if (period === "A" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}:00`;
  }

  const twentyFourHour = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(input);
  if (twentyFourHour) {
    const hours = Number(twentyFourHour[1] ?? "");
    const minutes = Number(twentyFourHour[2] ?? "");
    const seconds = Number(twentyFourHour[3] ?? "0");
    if (hours > 23 || minutes > 59 || seconds > 59) return input;
    return `${String(hours).padStart(2, "0")}:${twentyFourHour[2]}:${String(seconds).padStart(2, "0")}`;
  }

  return input;
}

export function formatDateTimeWithTimeOfDay(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("en-IN")} ${formatTimeOfDay(
    `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`,
  )}`;
}
