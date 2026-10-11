import type { Activity, AppData, Deal, User } from "./types";
import { daysBetween, parseISODate, startOfWeek, toISODate } from "./dates";

export type Rag = "green" | "yellow" | "red";

export interface UserKpi {
  user: User;
  newContacts: number;
  meetings: number;
  proposals: number;
  pipelineCreated: number;
  wonMonth: number;
  wonQuarter: number;
  monthTarget: number;
  quarterTarget: number;
  openPipeline: number;
  /** คะแนนเทียบเป้าแบบ pro-rata ตามวันทำงานที่ผ่านไปในสัปดาห์ (1 = ตรงเป้า) */
  score: number;
  rag: Rag;
  lastActivityDate?: string;
}

/** สัดส่วนเวลาทำงานที่ผ่านไปของสัปดาห์นี้ (จ-ศ 09:00–18:00, เสาร์-อาทิตย์ = 1) */
export function weekElapsed(today = new Date()): number {
  const dow = today.getDay();
  if (dow === 0 || dow === 6) return 1;
  const hours = today.getHours() + today.getMinutes() / 60;
  const dayProgress = Math.min(Math.max((hours - 9) / 9, 0), 1);
  return (dow - 1 + dayProgress) / 5;
}

/**
 * ผลงานเทียบเป้าที่ "ควรทำได้ถึงตอนนี้" (1 = ตรงเป้า, สูงสุด 1.2)
 * ถ้าเวลาผ่านไปยังไม่พอให้คาดหวังได้ถึง 1 ครั้ง จะยังไม่ตัดสิน (คืน 1)
 */
export function paceRatio(actual: number, target: number, today = new Date()): number {
  const expected = target * weekElapsed(today);
  if (target <= 0 || expected < 1) return 1;
  return Math.min(actual / expected, 1.2);
}

function inRange(date: string, from: Date, to: Date) {
  const d = parseISODate(date);
  return d >= from && d <= to;
}

export function weekRange(today = new Date()) {
  const from = startOfWeek(today);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return { from, to };
}

export function computeUserKpi(data: AppData, user: User, today = new Date()): UserKpi {
  const { from, to } = weekRange(today);
  const mine = data.activities.filter((a) => a.userId === user.id);
  const week = mine.filter((a) => inRange(a.date, from, to));
  const myDeals = data.deals.filter((d) => d.ownerId === user.id);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  const wonSince = (since: Date) =>
    myDeals
      .filter((d) => d.stage === "won" && d.closedAt && parseISODate(d.closedAt) >= since)
      .reduce((s, d) => s + d.value, 0);

  const newContacts = week.filter((a) => a.isNewContact).length;
  const meetings = week.filter((a) => a.type === "meeting").length;
  const proposals = week.filter((a) => a.type === "proposal").length;
  const { kpi } = data.settings;
  const ratio = (actual: number, target: number) => paceRatio(actual, target, today);
  const score =
    (ratio(newContacts, kpi.newContacts) + ratio(meetings, kpi.meetings) + ratio(proposals, kpi.proposals)) / 3;
  const rag: Rag = score >= 0.9 ? "green" : score >= 0.6 ? "yellow" : "red";

  return {
    user,
    newContacts,
    meetings,
    proposals,
    pipelineCreated: myDeals
      .filter((d) => inRange(d.createdAt, from, to))
      .reduce((s, d) => s + d.value, 0),
    wonMonth: wonSince(monthStart),
    wonQuarter: wonSince(qStart),
    monthTarget: user.monthlyTarget,
    quarterTarget: user.monthlyTarget * 3,
    openPipeline: myDeals
      .filter((d) => d.stage !== "won" && d.stage !== "lost")
      .reduce((s, d) => s + d.value, 0),
    score,
    rag,
    lastActivityDate: mine[0]?.date,
  };
}

export function teamKpis(data: AppData, today = new Date()): UserKpi[] {
  return data.users
    .filter((u) => u.role === "sales")
    .map((u) => computeUserKpi(data, u, today));
}

export interface StaleDeal {
  deal: Deal;
  days: number;
  threshold: number;
}

/** Deal ที่ค้างอยู่ขั้นเดิมนานเกินเกณฑ์ */
export function staleDeals(data: AppData, today = new Date()): StaleDeal[] {
  return data.deals
    .filter((d) => ["contacted", "meeting", "proposal", "negotiation"].includes(d.stage))
    .map((deal) => {
      const threshold =
        deal.stage === "proposal" ? data.settings.staleDays.proposal : data.settings.staleDays.other;
      return { deal, days: daysBetween(deal.stageChangedAt, today), threshold };
    })
    .filter((s) => s.days >= s.threshold)
    .sort((a, b) => b.days - b.threshold - (a.days - a.threshold));
}

/** งานถัดไปที่ถึงกำหนดหรือเลยกำหนด */
export function dueNextSteps(deals: Deal[], today = new Date(), withinDays = 3) {
  const t = toISODate(today);
  return deals
    .filter((d) => d.nextStepDate && d.stage !== "won" && d.stage !== "lost")
    .filter((d) => daysBetween(t, parseISODate(d.nextStepDate!)) <= withinDays)
    .sort((a, b) => a.nextStepDate!.localeCompare(b.nextStepDate!));
}

export function activitiesOf(data: AppData, userId?: string): Activity[] {
  return userId ? data.activities.filter((a) => a.userId === userId) : data.activities;
}

export const RAG_STYLE: Record<Rag, { label: string; dot: string; bg: string; text: string }> = {
  green: { label: "ตามเป้า", dot: "bg-ok", bg: "bg-green-50", text: "text-green-700" },
  yellow: { label: "ต้องเร่ง", dot: "bg-warn", bg: "bg-amber-50", text: "text-amber-700" },
  red: { label: "ต้องช่วย", dot: "bg-bad", bg: "bg-red-50", text: "text-red-700" },
};
