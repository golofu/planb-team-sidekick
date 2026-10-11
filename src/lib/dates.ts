export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** YYYY-MM-DD ตามเวลาท้องถิ่น */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** วันจันทร์ของสัปดาห์นี้ */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = r.getDay();
  r.setDate(r.getDate() - (dow === 0 ? 6 : dow - 1));
  return r;
}

export function daysBetween(a: string, b: Date): number {
  const ms = parseISODate(toISODate(b)).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function formatThaiDate(s: string): string {
  const d = parseISODate(s);
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]}`;
}

export function relativeDay(s: string, today = new Date()): string {
  const diff = -daysBetween(s, today);
  if (diff === 0) return "วันนี้";
  if (diff === 1) return "พรุ่งนี้";
  if (diff === -1) return "เมื่อวาน";
  if (diff < 0) return `${-diff} วันก่อน`;
  return `อีก ${diff} วัน`;
}

export function formatBaht(n: number): string {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `฿${Math.round(n / 1_000)}K`;
  return `฿${n}`;
}
