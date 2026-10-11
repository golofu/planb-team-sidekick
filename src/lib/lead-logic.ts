// กติกา New Lead (ตาม SPEC ข้อ 4): เจ้าของแบรนด์ → แจกวนรอบ 1→5 → เตือน 7/15 วัน → คืนกองกลาง
import type { AppData, Brand, Lead, LeadCandidate, User } from "./types";
import { SIGNAL_LABEL } from "./types";
import { addDays, daysBetween, formatBaht, formatThaiDate, parseISODate, toISODate } from "./dates";
import { SIGNAL_MEDIA } from "./lead-sources";

export const REMIND_FIRST = 7;
export const RELEASE_DAYS = 15;
const DEDUPE_DAYS = 14;
const LAPSED_DAYS = 90;

let seq = 0;
function uid(prefix: string) {
  seq = (seq + 1) % 1000;
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s.,'’-]+/g, "");

/** เซลส์ตามลำดับทีม (ลำดับการแจกวนรอบ 1→5) */
export function salesOrder(data: AppData): User[] {
  return data.users.filter((u) => u.role === "sales");
}

export function isOpen(lead: Lead) {
  return lead.status === "assigned" || lead.status === "working";
}

export function openLeadCount(data: AppData, userId: string) {
  return data.leads.filter((l) => l.ownerId === userId && isOpen(l)).length;
}

/** มี Activity ของเจ้าของ Lead กับแบรนด์นี้ ตั้งแต่วันที่ได้รับมอบหมาย */
export function hasActivitySince(data: AppData, lead: Lead): boolean {
  if (!lead.ownerId || !lead.brandId || !lead.assignedAt) return false;
  return data.activities.some(
    (a) => a.userId === lead.ownerId && a.brandId === lead.brandId && a.date >= lead.assignedAt!,
  );
}

export function leadAgeDays(lead: Lead, today = new Date()) {
  return lead.assignedAt ? daysBetween(lead.assignedAt, today) : 0;
}

export type ReminderKind = "before7" | "overdue7" | "before15";
export interface LeadReminder {
  lead: Lead;
  kind: ReminderKind;
  days: number;
  text: string;
}

/** เตือนก่อนครบ 7 วัน (วันที่ 5-6), เลย 7 วัน (7-12), ก่อนคืนกองกลาง (13-14) — เฉพาะ Lead ที่ยังไม่มี Activity */
export function leadReminders(data: AppData, userId?: string, today = new Date()): LeadReminder[] {
  const out: LeadReminder[] = [];
  for (const lead of data.leads) {
    if (!isOpen(lead) || (userId && lead.ownerId !== userId)) continue;
    if (hasActivitySince(data, lead)) continue;
    const days = leadAgeDays(lead, today);
    if (days >= RELEASE_DAYS - 2 && days < RELEASE_DAYS) {
      out.push({ lead, kind: "before15", days, text: `อีก ${RELEASE_DAYS - days} วัน Lead จะคืนกองกลาง` });
    } else if (days >= REMIND_FIRST && days < RELEASE_DAYS - 2) {
      out.push({ lead, kind: "overdue7", days, text: `เลย ${REMIND_FIRST} วันแล้ว ยังไม่มี Activity` });
    } else if (days >= REMIND_FIRST - 2 && days < REMIND_FIRST) {
      out.push({ lead, kind: "before7", days, text: `อีก ${REMIND_FIRST - days} วันครบ ${REMIND_FIRST} วัน — ยังไม่มี Activity` });
    }
  }
  return out.sort((a, b) => b.days - a.days);
}

/** แบรนด์ที่ไม่มีดีลของเจ้าของคนนี้แล้ว → ปลดเจ้าของ เพื่อให้ Lead ถัดไปแจกวนรอบได้ */
function releaseBrandIfIdle(brands: Brand[], data: AppData, brandId?: string, ownerId?: string): Brand[] {
  if (!brandId || !ownerId) return brands;
  const hasDeal = data.deals.some((d) => d.brandId === brandId && d.ownerId === ownerId);
  if (hasDeal) return brands;
  return brands.map((b) => (b.id === brandId && b.ownerId === ownerId ? { ...b, ownerId: undefined } : b));
}

/** Lead ที่ครบ 15 วันโดยไม่มี Activity → คืนกองกลาง */
export function sweepExpiredLeads(data: AppData, today = new Date()): AppData {
  const t = toISODate(today);
  let brands = data.brands;
  let changed = false;
  const leads = data.leads.map((lead) => {
    if (!isOpen(lead) || hasActivitySince(data, lead) || leadAgeDays(lead, today) < RELEASE_DAYS) return lead;
    changed = true;
    const owner = data.users.find((u) => u.id === lead.ownerId);
    brands = releaseBrandIfIdle(brands, data, lead.brandId, lead.ownerId);
    return {
      ...lead,
      status: "pool" as const,
      ownerId: undefined,
      assignedAt: undefined,
      history: [...lead.history, { at: t, text: `ครบ ${RELEASE_DAYS} วันไม่มี Activity — คืนกองกลาง (จาก ${owner?.nickname ?? "-"})` }],
    };
  });
  return changed ? { ...data, leads, brands } : data;
}

/** ลูกค้าเก่าที่เคยปิดได้ แต่หายไปเกิน 90 วันและไม่มีดีลเปิดอยู่ */
export function lapsedCandidates(data: AppData, today = new Date()): LeadCandidate[] {
  const out: LeadCandidate[] = [];
  for (const brand of data.brands) {
    const deals = data.deals.filter((d) => d.brandId === brand.id);
    if (deals.some((d) => d.stage !== "won" && d.stage !== "lost")) continue;
    const lastWon = deals
      .filter((d) => d.stage === "won" && d.closedAt)
      .sort((a, b) => b.closedAt!.localeCompare(a.closedAt!))[0];
    if (!lastWon) continue;
    const days = daysBetween(lastWon.closedAt!, today);
    if (days < LAPSED_DAYS) continue;
    out.push({
      brandName: brand.name,
      matchedBrandId: brand.id,
      category: brand.category,
      signal: "lapsed",
      score: Math.min(90, 70 + Math.round(lastWon.value / 1_000_000) * 2),
      reason: `เคยซื้อ "${lastWon.title}" ${formatBaht(lastWon.value)} เมื่อ ${Math.round(days / 30)} เดือนก่อน ยังไม่มีดีลใหม่`,
      contactAngle: "ชวนกลับมาด้วยผลงานแคมเปญเดิมและข้อเสนอพิเศษสำหรับลูกค้าเก่า",
      suggestedMedia: lastWon.media.length ? lastWon.media : SIGNAL_MEDIA.lapsed,
      headline: `ลูกค้าเก่า: ${brand.name} ไม่มีดีลใหม่ ${days} วัน`,
      url: "",
      source: "ข้อมูลลูกค้าในระบบ",
      publishedAt: today.toISOString(),
    });
  }
  return out;
}

function isDuplicate(data: AppData, c: LeadCandidate, brandId: string | undefined, today: Date) {
  const since = toISODate(addDays(today, -DEDUPE_DAYS));
  return data.leads.some(
    (l) =>
      (c.url && l.url === c.url) ||
      (l.createdAt >= since &&
        l.signal === c.signal &&
        ((brandId && l.brandId === brandId) || norm(l.brandName) === norm(c.brandName))),
  );
}

export interface AssignResult {
  data: AppData;
  added: Lead[];
}

/**
 * แจก Lead ใหม่
 * 1) แบรนด์มีเจ้าของ (และไม่ลา) → เจ้าของ
 * 2) ไม่มีเจ้าของ → วนรอบเซลส์ 1→5 ข้ามคนที่ลาหรือถือ Lead เต็มเพดาน
 * 3) ไม่มีใครรับได้ → กองกลาง
 */
export function assignCandidates(data: AppData, candidates: LeadCandidate[], today = new Date()): AssignResult {
  const t = toISODate(today);
  const sales = salesOrder(data);
  let rr = data.settings.leads.rrIndex % Math.max(sales.length, 1);
  let brands = [...data.brands];
  const added: Lead[] = [];
  const work: AppData = { ...data, brands, leads: [...data.leads] };

  for (const c of [...candidates].sort((a, b) => b.score - a.score)) {
    let brand =
      brands.find((b) => b.id === c.matchedBrandId) ?? brands.find((b) => norm(b.name) === norm(c.brandName));
    if (isDuplicate(work, c, brand?.id, today)) continue;

    let ownerId: string | undefined;
    let how = "";
    const owner = brand?.ownerId ? data.users.find((u) => u.id === brand!.ownerId) : undefined;
    if (owner && !owner.onLeave) {
      ownerId = owner.id;
      how = `ส่งให้เจ้าของแบรนด์ (${owner.nickname})`;
    } else {
      for (let i = 0; i < sales.length; i++) {
        const cand = sales[(rr + i) % sales.length];
        if (cand.onLeave || openLeadCount(work, cand.id) >= data.settings.leads.cap) continue;
        ownerId = cand.id;
        rr = (rr + i + 1) % sales.length;
        how = `แจกวนรอบ → ${cand.nickname}`;
        break;
      }
    }

    if (!brand) {
      brand = { id: uid("b"), name: c.brandName, category: c.category, ownerId, contactName: "", contactTitle: "" };
      brands = [...brands, brand];
    } else if (!brand.ownerId && ownerId) {
      const id = brand.id;
      brands = brands.map((b) => (b.id === id ? { ...b, ownerId } : b));
    }

    const lead: Lead = {
      ...c,
      id: uid("l"),
      brandId: brand.id,
      ownerId,
      status: ownerId ? "assigned" : "pool",
      createdAt: t,
      assignedAt: ownerId ? t : undefined,
      history: [{ at: t, text: ownerId ? how : "ไม่มีเซลส์ว่าง — เข้ากองกลาง" }],
    };
    added.push(lead);
    work.leads.push(lead);
    work.brands = brands;
  }

  return {
    data: {
      ...data,
      brands,
      leads: [...added, ...data.leads],
      settings: { ...data.settings, leads: { ...data.settings.leads, rrIndex: rr } },
    },
    added,
  };
}

export interface OwnerSuggestion {
  user: User;
  reason: string;
}

/** แนะนำคนรับ Lead: ถนัดหมวด > ถือ Lead น้อย > ยอด Won ไตรมาสนี้ */
export function recommendOwner(data: AppData, lead: Lead, today = new Date()): OwnerSuggestion | null {
  const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  const ranked = salesOrder(data)
    .filter((u) => !u.onLeave)
    .map((u) => {
      const fit = u.categories.includes(lead.category);
      const open = openLeadCount(data, u.id);
      const won = data.deals
        .filter((d) => d.ownerId === u.id && d.stage === "won" && d.closedAt && parseISODate(d.closedAt) >= qStart)
        .reduce((s, d) => s + d.value, 0);
      return { u, fit, open, won, score: (fit ? 10 : 0) - open + won / 5_000_000 };
    })
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top) return null;
  const parts = [top.fit ? `ถนัด ${lead.category}` : null, `ถือ ${top.open} Lead`, top.won ? `Won ไตรมาสนี้ ${formatBaht(top.won)}` : null];
  return { user: top.u, reason: parts.filter(Boolean).join(" · ") };
}

// ---------- ข้อความ LINE ----------

const leadLine = (l: Pick<LeadCandidate, "brandName" | "score" | "signal">, i: number, owner?: string) =>
  `${i + 1}) ${l.brandName} — ${l.score} ${SIGNAL_LABEL[l.signal].icon}${owner ? ` → ${owner}` : ""}`;

/** สรุปทั้งทีมสำหรับ Group Head */
export function buildTeamDigest(data: AppData, added: Lead[], appUrl: string, today = new Date()): string {
  const top = added[0];
  const reminders = leadReminders(data, undefined, today);
  const pool = data.leads.filter((l) => l.status === "pool" || l.status === "requested").length;
  return [
    `☀️ New Lead ประจำวัน ${formatThaiDate(toISODate(today))}`,
    added.length
      ? `วันนี้มี ${added.length} Lead ใหม่ 🔥 สูงสุด: ${top.brandName} (${top.score}) ${SIGNAL_LABEL[top.signal].label}`
      : "วันนี้ยังไม่พบ Lead ใหม่",
    "",
    ...added.slice(0, 10).map((l, i) => leadLine(l, i, data.users.find((u) => u.id === l.ownerId)?.nickname ?? "กองกลาง")),
    reminders.length || pool ? "" : null,
    reminders.length ? `⏰ Lead ต้องติดตาม ${reminders.length} รายการ` : null,
    pool ? `📥 กองกลาง ${pool} Lead รอมอบหมาย` : null,
    "",
    `เปิดดู: ${appUrl}/leads`,
  ]
    .filter((x) => x !== null)
    .join("\n");
}

/** สรุปส่วนตัวสำหรับเซลส์แต่ละคน */
export function buildPersonalDigest(data: AppData, user: User, added: Lead[], appUrl: string, today = new Date()): string | null {
  const mine = added.filter((l) => l.ownerId === user.id);
  const reminders = leadReminders(data, user.id, today);
  if (!mine.length && !reminders.length) return null;
  return [
    `☀️ สวัสดี ${user.nickname} — Lead ของคุณวันนี้`,
    ...mine.map((l, i) => `${leadLine(l, i)}\n   ${l.contactAngle}`),
    ...reminders.map((r) => `⏰ ${r.lead.brandName}: ${r.text}`),
    "",
    `เปิดดู: ${appUrl}/leads`,
  ].join("\n");
}

/** สรุปจาก cron (ยังไม่มีฐานข้อมูลกลาง จึงยังไม่แจกรายคน) */
export function buildCronDigest(candidates: LeadCandidate[], appUrl = ""): string {
  const top = candidates[0];
  return [
    `☀️ New Lead ประจำวัน`,
    candidates.length ? `พบ ${candidates.length} Lead 🔥 สูงสุด: ${top.brandName} (${top.score})` : "วันนี้ยังไม่พบ Lead ใหม่",
    "",
    ...candidates.slice(0, 10).map((c, i) => leadLine(c, i)),
    appUrl ? `\nเปิดดู: ${appUrl}/leads` : "",
  ].join("\n");
}
