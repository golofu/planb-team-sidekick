export type Role = "head" | "sales";

export interface User {
  id: string;
  name: string;
  nickname: string;
  email: string;
  role: Role;
  color: string;
  /** หมวดลูกค้าที่ดูแล (Portfolio) */
  categories: string[];
  /** เป้ายอดขายรายเดือน (บาท) */
  monthlyTarget: number;
  /** ลา/ไม่รับ Lead ชั่วคราว (ข้ามในการแจกวนรอบ) */
  onLeave?: boolean;
  /** LINE userId สำหรับส่ง Lead ส่วนตัว (ได้จาก LINE OA หลังเพิ่มเพื่อน) */
  lineUserId?: string;
}

export interface Brand {
  id: string;
  name: string;
  category: string;
  /** Media agency ที่ดูแลแบรนด์ (ถ้ามี) */
  agency?: string;
  ownerId?: string;
  contactName: string;
  contactTitle: string;
}

export const STAGES = [
  "lead",
  "contacted",
  "meeting",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  lead: "Lead",
  contacted: "ติดต่อแล้ว",
  meeting: "นัดพบ / Brief",
  proposal: "ส่ง Proposal",
  negotiation: "ต่อรอง",
  won: "Won",
  lost: "Lost",
};

export interface Deal {
  id: string;
  brandId: string;
  ownerId: string;
  title: string;
  value: number;
  stage: Stage;
  media: string[];
  createdAt: string;
  stageChangedAt: string;
  closedAt?: string;
  nextStep?: string;
  nextStepDate?: string;
}

export const ACTIVITY_TYPES = [
  "call",
  "line",
  "email",
  "meeting",
  "proposal",
  "other",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  call: "โทร",
  line: "LINE",
  email: "อีเมล",
  meeting: "นัดพบ",
  proposal: "ส่ง Proposal",
  other: "อื่นๆ",
};

export interface Activity {
  id: string;
  userId: string;
  brandId?: string;
  dealId?: string;
  type: ActivityType;
  summary: string;
  rawText: string;
  date: string;
  /** ติดต่อลูกค้าใหม่ (นับเข้า KPI ติดต่อลูกค้าใหม่) */
  isNewContact: boolean;
  stageAfter?: Stage;
  nextStep?: string;
  nextStepDate?: string;
}

export interface CoachNote {
  id: string;
  authorId: string;
  activityId: string;
  text: string;
  createdAt: string;
}

export interface KpiTargets {
  newContacts: number;
  meetings: number;
  proposals: number;
}

export interface Settings {
  kpi: KpiTargets;
  staleDays: { proposal: number; other: number };
  leads: LeadSettings;
}

export interface LeadSettings {
  /** จำนวน Lead ที่ถือได้สูงสุดต่อคน (เกินแล้วข้ามในการแจกวนรอบ) */
  cap: number;
  /** ตำแหน่งถัดไปในการแจกวนรอบ (index ใน sales ที่เรียงตามลำดับทีม) */
  rrIndex: number;
  sources: LeadSource[];
  lastScanDate?: string;
  lastScanStats?: ScanStats;
}

export interface CoachReport {
  text: string;
  createdAt: string;
  source: "ai" | "rules";
}

export interface AppData {
  version: number;
  users: User[];
  brands: Brand[];
  deals: Deal[];
  activities: Activity[];
  notes: CoachNote[];
  leads: Lead[];
  settings: Settings;
  coachReport?: CoachReport;
}

/** ผลลัพธ์จากการแปลงข้อความ Activity เป็นข้อมูลมีโครงสร้าง */
export interface ParsedActivity {
  brandName: string;
  matchedBrandId: string;
  type: ActivityType;
  summary: string;
  isNewContact: boolean;
  stage: Stage | "unchanged";
  nextStep: string;
  nextStepDate: string;
  dealValue: number;
  media: string[];
}

/** แบรนด์ที่ Sales มองเห็น: ของตัวเอง + กองกลาง (ยังไม่มีเจ้าของ) */
export const visibleToSales =
  (userId: string) =>
  (b: Brand): boolean =>
    !b.ownerId || b.ownerId === userId;

// ---------- New Lead (Sprint 2) ----------

export const LEAD_SIGNALS = [
  "launch",
  "expansion",
  "competitor_media",
  "funding",
  "seasonal",
  "lapsed",
] as const;
export type LeadSignal = (typeof LEAD_SIGNALS)[number];

export const SIGNAL_LABEL: Record<LeadSignal, { label: string; icon: string }> = {
  launch: { label: "เปิดตัวสินค้า/แบรนด์ใหม่", icon: "🚀" },
  expansion: { label: "ขยายสาขา", icon: "🏪" },
  competitor_media: { label: "ลงสื่อคู่แข่ง", icon: "📺" },
  funding: { label: "ได้เงินทุน / IPO", icon: "💰" },
  seasonal: { label: "ฤดูกาล / อีเวนต์", icon: "📅" },
  lapsed: { label: "ลูกค้าเก่าที่หายไป", icon: "🔁" },
};

export interface LeadSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface ScanStats {
  at: string;
  mode: "ai" | "rules";
  items: number;
  leads: number;
  sources: { name: string; ok: boolean; count: number }[];
  warning?: string;
}

/** Lead ที่ได้จากการสแกนข่าว (ก่อนแจกให้เซลส์) */
export interface LeadCandidate {
  brandName: string;
  matchedBrandId: string;
  category: string;
  signal: LeadSignal;
  score: number;
  reason: string;
  contactAngle: string;
  suggestedMedia: string[];
  headline: string;
  url: string;
  source: string;
  publishedAt: string;
}

export type LeadStatus = "assigned" | "working" | "pool" | "requested" | "dismissed";

export interface Lead extends LeadCandidate {
  id: string;
  brandId?: string;
  ownerId?: string;
  status: LeadStatus;
  createdAt: string;
  /** วันที่มอบหมายล่าสุด (ใช้นับ 7/15 วัน) */
  assignedAt?: string;
  requestedBy?: string;
  dealId?: string;
  history: { at: string; text: string }[];
}
