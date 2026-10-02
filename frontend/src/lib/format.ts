// Indian-style number + currency + date formatting helpers.

export function groupIndian(value: number): string {
  const neg = value < 0;
  const n = Math.abs(Math.round(value));
  const s = String(n);
  if (s.length <= 3) return (neg ? "-" : "") + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const withCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (neg ? "-" : "") + withCommas + "," + last3;
}

export function money(value: number | undefined | null): string {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  return "₹" + groupIndian(v);
}

export function num(value: number | undefined | null): string {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  // keep up to 1 decimal for day counts like 2.5
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export function todayStr(): string {
  return toDateStr(new Date());
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function prettyDate(dateStr: string): string {
  // dateStr: YYYY-MM-DD
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function prettyMonth(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  if (!y || !m) return monthStr;
  return `${MONTHS_FULL[m - 1]} ${y}`;
}

export function shiftDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return toDateStr(dt);
}

export function shiftMonth(monthStr: string, deltaMonths: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const dt = new Date(y, m - 1 + deltaMonths, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayStr();
}
