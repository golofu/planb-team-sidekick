"use client";

// ตัวเก็บข้อมูลของต้นแบบ: เก็บใน localStorage ของเบราว์เซอร์
// เฟสถัดไปจะเปลี่ยนเป็น Supabase (ดู supabase/schema.sql) โดยหน้าเว็บเรียกผ่าน hook เดิม
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Activity,
  AppData,
  CoachNote,
  CoachReport,
  Deal,
  Lead,
  LeadCandidate,
  ScanStats,
  Settings,
  Stage,
  User,
} from "./types";
import { buildSeedData, DATA_VERSION, DEFAULT_LEAD_SETTINGS } from "./mock-data";
import { toISODate } from "./dates";
import { assignCandidates, lapsedCandidates, sweepExpiredLeads } from "./lead-logic";

const DATA_KEY = "pbts-data";
const USER_KEY = "pbts-user";

interface Store {
  ready: boolean;
  data: AppData;
  me: User | null;
  isHead: boolean;
  login: (userId: string) => void;
  logout: () => void;
  addActivity: (a: Omit<Activity, "id">, dealPatch?: DealPatch) => void;
  addDeal: (d: Omit<Deal, "id" | "createdAt" | "stageChangedAt">) => Deal;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  moveDeal: (id: string, stage: Stage) => void;
  addNote: (n: Omit<CoachNote, "id" | "createdAt">) => void;
  updateSettings: (s: Settings) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  setCoachReport: (r: CoachReport) => void;
  resetDemo: () => void;
  /** แจก Lead จากผลสแกน (รวม Lead ลูกค้าเก่า) แล้วคืน Lead ที่เพิ่มใหม่ */
  applyLeadScan: (candidates: LeadCandidate[], stats: ScanStats) => Lead[];
  /** เซลส์กด "เริ่มติดต่อ" → สร้าง Deal ขั้น Lead */
  acceptLead: (leadId: string) => void;
  dismissLead: (leadId: string, reason: string) => void;
  /** เซลส์ขอรับ Lead จากกองกลาง (รอ Head อนุมัติ) */
  requestLead: (leadId: string) => void;
  /** Head มอบหมาย/เปลี่ยนคนรับ (รวมถึงอนุมัติคำขอ) */
  assignLead: (leadId: string, userId: string) => void;
}

export interface DealPatch {
  dealId?: string;
  newDeal?: Omit<Deal, "id" | "createdAt" | "stageChangedAt">;
  stage?: Stage;
  nextStep?: string;
  nextStepDate?: string;
}

const StoreContext = createContext<Store | null>(null);

const EMPTY_DATA: AppData = {
  version: DATA_VERSION,
  users: [],
  brands: [],
  deals: [],
  activities: [],
  notes: [],
  leads: [],
  settings: {
    kpi: { newContacts: 15, meetings: 4, proposals: 2 },
    staleDays: { proposal: 10, other: 14 },
    leads: DEFAULT_LEAD_SETTINGS,
  },
};

/** อัปเกรดข้อมูลเก่าโดยไม่ลบงานที่ทีมบันทึกไว้ */
function migrate(saved: AppData | null): AppData | null {
  if (!saved) return null;
  if (saved.version === DATA_VERSION) return saved;
  if (saved.version === 1) {
    return {
      ...saved,
      version: DATA_VERSION,
      leads: [],
      settings: { ...saved.settings, leads: DEFAULT_LEAD_SETTINGS },
    };
  }
  return null;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage เต็มหรือถูกบล็อก — ใช้งานต่อในหน่วยความจำ
  }
}

function applyStage(deal: Deal, stage: Stage, today: string): Deal {
  if (deal.stage === stage) return deal;
  return {
    ...deal,
    stage,
    stageChangedAt: today,
    closedAt: stage === "won" || stage === "lost" ? today : undefined,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  // ข้อมูลจริงสร้างหลัง mount เท่านั้น (seed ขึ้นกับวันที่ปัจจุบัน จึง prerender ไม่ได้)
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    const saved = migrate(readStorage<AppData>(DATA_KEY));
    // Lead ที่ครบ 15 วันไม่มี Activity คืนกองกลางทุกครั้งที่เปิดแอป
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage once on mount
    setData(sweepExpiredLeads(saved ?? buildSeedData()));
    setMeId(readStorage<string>(USER_KEY));
    setReady(true);
  }, []);

  // ค่าล่าสุดสำหรับงาน async (สแกน Lead ใช้เวลาหลายวินาที ต้องคำนวณจากข้อมูล ณ ตอนได้ผล)
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
    if (ready) writeStorage(DATA_KEY, data);
  }, [data, ready]);

  const login = useCallback((userId: string) => {
    setMeId(userId);
    writeStorage(USER_KEY, userId);
  }, []);

  const logout = useCallback(() => {
    setMeId(null);
    writeStorage(USER_KEY, null);
  }, []);

  const addDeal = useCallback(
    (d: Omit<Deal, "id" | "createdAt" | "stageChangedAt">) => {
      const today = toISODate(new Date());
      const deal: Deal = { ...d, id: uid("d"), createdAt: today, stageChangedAt: today };
      setData((prev) => ({ ...prev, deals: [deal, ...prev.deals] }));
      return deal;
    },
    [],
  );

  const addActivity = useCallback(
    (a: Omit<Activity, "id">, patch?: DealPatch) => {
      const today = toISODate(new Date());
      setData((prev) => {
        let deals = prev.deals;
        let dealId = patch?.dealId ?? a.dealId;
        if (patch?.newDeal) {
          const nd: Deal = { ...patch.newDeal, id: uid("d"), createdAt: today, stageChangedAt: today };
          deals = [nd, ...deals];
          dealId = nd.id;
        } else if (dealId && patch) {
          deals = deals.map((d) => {
            if (d.id !== dealId) return d;
            let next = patch.stage ? applyStage(d, patch.stage, today) : d;
            if (patch.nextStep !== undefined) next = { ...next, nextStep: patch.nextStep || undefined };
            if (patch.nextStepDate !== undefined) next = { ...next, nextStepDate: patch.nextStepDate || undefined };
            return next;
          });
        }
        const activity: Activity = { ...a, id: uid("a"), dealId };
        return { ...prev, deals, activities: [activity, ...prev.activities] };
      });
    },
    [],
  );

  const updateDeal = useCallback((id: string, patch: Partial<Deal>) => {
    setData((prev) => ({
      ...prev,
      deals: prev.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  }, []);

  const moveDeal = useCallback((id: string, stage: Stage) => {
    const today = toISODate(new Date());
    setData((prev) => ({
      ...prev,
      deals: prev.deals.map((d) => (d.id === id ? applyStage(d, stage, today) : d)),
    }));
  }, []);

  const addNote = useCallback((n: Omit<CoachNote, "id" | "createdAt">) => {
    const note: CoachNote = { ...n, id: uid("n"), createdAt: new Date().toISOString() };
    setData((prev) => ({ ...prev, notes: [...prev.notes, note] }));
  }, []);

  const updateSettings = useCallback((settings: Settings) => {
    setData((prev) => ({ ...prev, settings }));
  }, []);

  const updateUser = useCallback((id: string, patch: Partial<User>) => {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  }, []);

  const setCoachReport = useCallback((coachReport: CoachReport) => {
    setData((prev) => ({ ...prev, coachReport }));
  }, []);

  const resetDemo = useCallback(() => {
    setData(buildSeedData());
  }, []);

  const applyLeadScan = useCallback(
    (candidates: LeadCandidate[], stats: ScanStats) => {
      const today = new Date();
      const swept = sweepExpiredLeads(dataRef.current, today);
      const { data: next, added } = assignCandidates(
        swept,
        [...candidates, ...lapsedCandidates(swept, today)],
        today,
      );
      const final: AppData = {
        ...next,
        settings: {
          ...next.settings,
          leads: { ...next.settings.leads, lastScanDate: toISODate(today), lastScanStats: stats },
        },
      };
      dataRef.current = final;
      setData(final);
      return added;
    },
    [],
  );

  const patchLead = useCallback((leadId: string, fn: (l: Lead, prev: AppData) => Partial<AppData> & { lead: Lead }) => {
    setData((prev) => {
      const lead = prev.leads.find((l) => l.id === leadId);
      if (!lead) return prev;
      const { lead: updated, ...rest } = fn(lead, prev);
      return { ...prev, ...rest, leads: prev.leads.map((l) => (l.id === leadId ? updated : l)) };
    });
  }, []);

  const acceptLead = useCallback(
    (leadId: string) => {
      const today = toISODate(new Date());
      patchLead(leadId, (lead, prev) => {
        if (!lead.brandId || !lead.ownerId || lead.dealId) return { lead };
        const deal: Deal = {
          id: uid("d"),
          brandId: lead.brandId,
          ownerId: lead.ownerId,
          title: lead.headline.slice(0, 70),
          value: 0,
          stage: "lead",
          media: lead.suggestedMedia,
          createdAt: today,
          stageChangedAt: today,
          nextStep: "ติดต่อครั้งแรก",
          nextStepDate: today,
        };
        return {
          deals: [deal, ...prev.deals],
          lead: {
            ...lead,
            status: "working",
            dealId: deal.id,
            history: [...lead.history, { at: today, text: "เริ่มติดต่อ — สร้าง Deal ใน Pipeline" }],
          },
        };
      });
    },
    [patchLead],
  );

  const dismissLead = useCallback(
    (leadId: string, reason: string) => {
      const today = toISODate(new Date());
      patchLead(leadId, (lead, prev) => {
        const hasDeal = prev.deals.some((d) => d.brandId === lead.brandId && d.ownerId === lead.ownerId);
        return {
          brands: hasDeal
            ? prev.brands
            : prev.brands.map((b) => (b.id === lead.brandId && b.ownerId === lead.ownerId ? { ...b, ownerId: undefined } : b)),
          lead: {
            ...lead,
            status: "dismissed",
            history: [...lead.history, { at: today, text: `ไม่เหมาะ: ${reason || "-"}` }],
          },
        };
      });
    },
    [patchLead],
  );

  const requestLead = useCallback(
    (leadId: string) => {
      if (!meId) return;
      const today = toISODate(new Date());
      patchLead(leadId, (lead, prev) => ({
        lead:
          lead.status === "pool"
            ? {
                ...lead,
                status: "requested",
                requestedBy: meId,
                history: [
                  ...lead.history,
                  { at: today, text: `${prev.users.find((u) => u.id === meId)?.nickname} ขอรับ Lead` },
                ],
              }
            : lead,
      }));
    },
    [patchLead, meId],
  );

  const assignLead = useCallback(
    (leadId: string, userId: string) => {
      const today = toISODate(new Date());
      patchLead(leadId, (lead, prev) => {
        const user = prev.users.find((u) => u.id === userId);
        const brands = prev.brands.map((b) => (b.id === lead.brandId ? { ...b, ownerId: userId } : b));
        const deals = lead.dealId
          ? prev.deals.map((d) => (d.id === lead.dealId ? { ...d, ownerId: userId } : d))
          : prev.deals;
        return {
          brands,
          deals,
          lead: {
            ...lead,
            ownerId: userId,
            status: lead.dealId ? "working" : "assigned",
            assignedAt: today,
            requestedBy: undefined,
            history: [...lead.history, { at: today, text: `Head มอบหมายให้ ${user?.nickname}` }],
          },
        };
      });
    },
    [patchLead],
  );

  const me = useMemo(
    () => data.users.find((u) => u.id === meId) ?? null,
    [data.users, meId],
  );

  const value: Store = {
    ready,
    data,
    me,
    isHead: me?.role === "head",
    login,
    logout,
    addActivity,
    addDeal,
    updateDeal,
    moveDeal,
    addNote,
    updateSettings,
    updateUser,
    setCoachReport,
    resetDemo,
    applyLeadScan,
    acceptLead,
    dismissLead,
    requestLead,
    assignLead,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
