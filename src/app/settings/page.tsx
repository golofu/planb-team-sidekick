"use client";

import { useState } from "react";
import { Plus, RotateCcw, Save, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { DEFAULT_SOURCES } from "@/lib/lead-sources";
import type { LeadSource } from "@/lib/types";
import Avatar from "@/components/Avatar";
import { PageHeader } from "@/components/ui";

export default function SettingsPage() {
  const { data, isHead, updateSettings, updateUser, resetDemo } = useStore();
  const [settings, setSettings] = useState(data.settings);
  const [saved, setSaved] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", url: "" });

  if (!isHead) {
    return <div className="card mx-auto max-w-md p-8 text-center text-muted">หน้านี้สำหรับ Group Head เท่านั้น</div>;
  }

  const num = (v: string) => Math.max(0, Number(v) || 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="ตั้งเป้า KPI, เป้ายอดขาย และ Portfolio ของทีม" />

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-navy-800">เป้า KPI ต่อคน / สัปดาห์</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["newContacts", "ติดต่อลูกค้าใหม่"],
              ["meetings", "นัดพบ"],
              ["proposals", "ส่ง Proposal"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              <span className="text-muted">{label}</span>
              <input
                type="number"
                className="input mt-1"
                value={settings.kpi[key]}
                onChange={(e) => setSettings({ ...settings, kpi: { ...settings.kpi, [key]: num(e.target.value) } })}
              />
            </label>
          ))}
        </div>
        <h2 className="mb-3 mt-5 font-semibold text-navy-800">เกณฑ์ Deal ค้าง (วัน)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted">ขั้นส่ง Proposal</span>
            <input
              type="number"
              className="input mt-1"
              value={settings.staleDays.proposal}
              onChange={(e) => setSettings({ ...settings, staleDays: { ...settings.staleDays, proposal: num(e.target.value) } })}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">ขั้นอื่นๆ</span>
            <input
              type="number"
              className="input mt-1"
              value={settings.staleDays.other}
              onChange={(e) => setSettings({ ...settings, staleDays: { ...settings.staleDays, other: num(e.target.value) } })}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            className="btn btn-primary"
            onClick={() => {
              updateSettings({ ...data.settings, kpi: settings.kpi, staleDays: settings.staleDays });
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
          >
            <Save size={16} /> บันทึก
          </button>
          {saved && <span className="text-sm text-green-700">บันทึกแล้ว</span>}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-navy-800">ทีม: เป้ายอดขายรายเดือนและ Portfolio</h2>
        <div className="space-y-3">
          {data.users
            .filter((u) => u.role === "sales")
            .map((u) => (
              <div key={u.id} className="grid items-center gap-3 rounded-xl border border-line p-3 sm:grid-cols-[auto_1fr_10rem_1fr]">
                <Avatar user={u} size={34} />
                <div>
                  <div className="font-semibold text-navy-800">{u.nickname}</div>
                  <label className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <input
                      type="checkbox"
                      className="accent-navy-800"
                      checked={!!u.onLeave}
                      onChange={(e) => updateUser(u.id, { onLeave: e.target.checked })}
                    />
                    ลา / หยุดรับ Lead
                  </label>
                </div>
                <label className="text-xs">
                  <span className="text-muted">เป้า/เดือน (บาท)</span>
                  <input
                    type="number"
                    className="input mt-1 text-sm"
                    value={u.monthlyTarget}
                    onChange={(e) => updateUser(u.id, { monthlyTarget: num(e.target.value) })}
                  />
                </label>
                <label className="text-xs">
                  <span className="text-muted">หมวดที่ดูแล (คั่นด้วย ,)</span>
                  <input
                    className="input mt-1 text-sm"
                    defaultValue={u.categories.join(", ")}
                    onBlur={(e) =>
                      updateUser(u.id, {
                        categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </label>
                <label className="text-xs sm:col-span-4">
                  <span className="text-muted">LINE userId (สำหรับส่ง Lead ส่วนตัว — ได้จาก LINE OA หลังเพิ่มเพื่อน)</span>
                  <input
                    className="input mt-1 text-sm"
                    placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    defaultValue={u.lineUserId ?? ""}
                    onBlur={(e) => updateUser(u.id, { lineUserId: e.target.value.trim() || undefined })}
                  />
                </label>
              </div>
            ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-navy-800">New Lead</h2>
        <label className="block max-w-xs text-sm">
          <span className="text-muted">จำนวน Lead ที่ถือได้สูงสุดต่อคน (เกินแล้วข้ามในการแจกวนรอบ)</span>
          <input
            type="number"
            className="input mt-1"
            value={data.settings.leads.cap}
            onChange={(e) =>
              updateSettings({ ...data.settings, leads: { ...data.settings.leads, cap: Math.max(1, num(e.target.value)) } })
            }
          />
        </label>
        <h3 className="mb-2 mt-5 text-sm font-semibold text-navy-800">แหล่งข่าว ({data.settings.leads.sources.filter((x) => x.enabled).length} เปิดใช้)</h3>
        <ul className="space-y-1.5">
          {data.settings.leads.sources.map((src) => {
            const setSources = (sources: LeadSource[]) =>
              updateSettings({ ...data.settings, leads: { ...data.settings.leads, sources } });
            return (
              <li key={src.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-navy-800"
                  checked={src.enabled}
                  onChange={(e) =>
                    setSources(data.settings.leads.sources.map((x) => (x.id === src.id ? { ...x, enabled: e.target.checked } : x)))
                  }
                  aria-label={`เปิดใช้ ${src.name}`}
                />
                <span className="font-medium">{src.name}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{src.url}</span>
                <button
                  className="text-muted hover:text-bad"
                  onClick={() => setSources(data.settings.leads.sources.filter((x) => x.id !== src.id))}
                  aria-label={`ลบ ${src.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
        <form
          className="mt-2 grid gap-2 sm:grid-cols-[10rem_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newSource.name.trim() || !/^https:\/\//.test(newSource.url.trim())) return;
            updateSettings({
              ...data.settings,
              leads: {
                ...data.settings.leads,
                sources: [
                  ...data.settings.leads.sources,
                  { id: `src-${Date.now()}`, name: newSource.name.trim(), url: newSource.url.trim(), enabled: true },
                ],
              },
            });
            setNewSource({ name: "", url: "" });
          }}
        >
          <input
            className="input text-sm"
            placeholder="ชื่อแหล่ง"
            value={newSource.name}
            onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
          />
          <input
            className="input text-sm"
            placeholder="https://… (RSS feed)"
            value={newSource.url}
            onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
          />
          <button className="btn btn-ghost">
            <Plus size={16} /> เพิ่ม
          </button>
        </form>
        <button
          className="mt-2 text-xs text-sky-500 hover:underline"
          onClick={() => updateSettings({ ...data.settings, leads: { ...data.settings.leads, sources: DEFAULT_SOURCES } })}
        >
          คืนค่าแหล่งข่าวตั้งต้น
        </button>
      </div>

      <div className="card p-5">
        <h2 className="mb-1 font-semibold text-navy-800">ข้อมูลทดลอง</h2>
        <p className="mb-3 text-sm text-muted">
          ตอนนี้ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น (ต้นแบบ) — เมื่อเชื่อม Supabase ทุกคนในทีมจะเห็นข้อมูลชุดเดียวกัน
        </p>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (confirm("รีเซ็ตข้อมูลทดลองทั้งหมดกลับเป็นค่าเริ่มต้น?")) {
              resetDemo();
              location.reload();
            }
          }}
        >
          <RotateCcw size={16} /> รีเซ็ตข้อมูลทดลอง
        </button>
      </div>
    </div>
  );
}
