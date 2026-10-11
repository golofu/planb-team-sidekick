"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useStore } from "./store";
import { toISODate } from "./dates";
import type { Lead, LeadCandidate, ScanStats } from "./types";

const SCAN_HOUR = 8;

// สถานะการสแกนใช้ร่วมกันทั้งแอป (ปุ่มกดเอง + สแกนอัตโนมัติ) — มีได้ครั้งละ 1 การสแกน
interface ScanState {
  scanning: boolean;
  error: string | null;
  lastAdded: Lead[] | null;
}
let state: ScanState = { scanning: false, error: null, lastAdded: null };
const SERVER_STATE: ScanState = { scanning: false, error: null, lastAdded: null };
const listeners = new Set<() => void>();
function setState(patch: Partial<ScanState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** สแกนข่าวหา Lead (กดเอง หรืออัตโนมัติวันละครั้งหลัง 08:00) */
export function useLeadScan() {
  const { data, applyLeadScan } = useStore();
  const snap = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);

  const scan = useCallback(async () => {
    if (state.scanning) return null;
    setState({ scanning: true, error: null });
    try {
      const res = await fetch("/api/leads/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: data.settings.leads.sources.filter((s) => s.enabled),
          knownBrands: data.brands.map((b) => ({ id: b.id, name: b.name })),
          categories: [...new Set(data.users.flatMap((u) => u.categories))],
        }),
      });
      const json = (await res.json()) as { candidates?: LeadCandidate[]; stats?: ScanStats; error?: string };
      if (!res.ok || !json.candidates || !json.stats) throw new Error(json.error ?? `HTTP ${res.status}`);
      const added = applyLeadScan(json.candidates, json.stats);
      setState({ scanning: false, lastAdded: added });
      return added;
    } catch (e) {
      setState({ scanning: false, error: e instanceof Error ? e.message : "สแกนไม่สำเร็จ" });
      return null;
    }
  }, [data.settings.leads.sources, data.brands, data.users, applyLeadScan]);

  return { scan, ...snap };
}

/** เรียกใน AppShell: ถ้าวันนี้ยังไม่สแกนและเลย 08:00 แล้ว ให้สแกนอัตโนมัติ (แทน cron ในต้นแบบ) */
export function useDailyAutoScan() {
  const { ready, me, data } = useStore();
  const { scan } = useLeadScan();
  const tried = useRef(false);
  const last = data.settings.leads.lastScanDate;

  useEffect(() => {
    if (!ready || !me || tried.current) return;
    const now = new Date();
    if (now.getHours() < SCAN_HOUR || last === toISODate(now)) return;
    tried.current = true;
    void scan();
  }, [ready, me, last, scan]);
}
