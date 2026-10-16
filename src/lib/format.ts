export const formatMoney = (paisa: number) =>
  Number.isSafeInteger(paisa)
    ? new Intl.NumberFormat("en-BD", {
        style: "currency",
        currency: "BDT",
      }).format(paisa / 100)
    : "Unavailable";
export const formatCurrency = formatMoney;
export function bdtToPaisa(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || value.length > 24)
    throw new Error("Enter a BDT amount with at most two decimals.");
  const [whole, fraction = ""] = value.split(".");
  const paisa = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (paisa < BigInt(1) || paisa > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Enter a valid positive price.");
  return Number(paisa);
}
export function utcToDhakaLocal(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
export function dhakaLocalToUtc(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Invalid Bangladesh date/time.");
  const date = new Date(`${value}:00+06:00`);
  if (
    !Number.isFinite(date.getTime()) ||
    utcToDhakaLocal(date.toISOString()) !== value
  )
    throw new Error("Invalid Bangladesh date/time.");
  return date.toISOString();
}
export function dhakaDayBounds(value: string) {
  const start = dhakaLocalToUtc(`${value}T00:00`);
  return { start, end: new Date(Date.parse(start) + 86_400_000).toISOString() };
}
export function dhakaWeekend(now = new Date()) {
  const today = utcToDhakaLocal(now.toISOString()).slice(0, 10);
  const start = Date.parse(dhakaDayBounds(today).start);
  const weekday = new Date(start + 21_600_000).getUTCDay();
  const offset = weekday === 6 ? -1 : (5 - weekday + 7) % 7;
  return {
    startDate: utcToDhakaLocal(
      new Date(start + offset * 86_400_000).toISOString(),
    ).slice(0, 10),
    endDate: utcToDhakaLocal(
      new Date(start + (offset + 1) * 86_400_000).toISOString(),
    ).slice(0, 10),
  };
}
export const formatEventRange = (start: string, end: string) =>
  `${formatEventDate(start)} — ${formatEventDate(end)}`;
export const formatEventDate = (value: string, time = true) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return (
    new Intl.DateTimeFormat("en-BD", {
      timeZone: "Asia/Dhaka",
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(date) + (time ? " · Asia/Dhaka" : "")
  );
};

export function formatBookingRange(start: string, end: string) {
  const day = (value: string) => formatEventDate(value, false);
  const time = new Intl.DateTimeFormat("en-BD", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
  });
  const first = new Date(start),
    last = new Date(end);
  if (!Number.isFinite(+first) || !Number.isFinite(+last))
    return "Date unavailable";
  return `${day(start)} · ${time.format(first)}–${day(start) === day(end) ? "" : day(end) + " · "}${time.format(last)} (Dhaka)`;
}
