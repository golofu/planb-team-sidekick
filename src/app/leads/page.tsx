"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlarmClock,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Lightbulb,
  Loader2,
  Radar,
  Send,
  Target,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useLeadScan } from "@/lib/use-lead-scan";
import {
  buildPersonalDigest,
  buildTeamDigest,
  isOpen,
  leadAgeDays,
  leadReminders,
  recommendOwner,
  RELEASE_DAYS,
  type LeadReminder,
} from "@/lib/lead-logic";
import { formatThaiDate, toISODate } from "@/lib/dates";
import { SIGNAL_LABEL, type Lead } from "@/lib/types";
import Avatar from "@/components/Avatar";
import { Badge, PageHeader } from "@/components/ui";

type Tab = "mine" | "all" | "pool" | "closed";

const REMINDER_STYLE: Record<LeadReminder["kind"], string> = {
  before7: "bg-amber-50 text-amber-700",
  overdue7: "bg-orange-50 text-orange-700",
  before15: "bg-red-50 text-red-700",
};

function scoreColor(score: number) {
  if (score >= 85) return "bg-navy-800 text-white";
  if (score >= 70) return "bg-sky-500 text-white";
  return "bg-sky-100 text-navy-700";
}

export default function LeadsPage() {
  const { data, me, isHead } = useStore();
  const { scan, scanning, error, lastAdded } = useLeadScan();
  const [tabChoice, setTab] = useState<Tab | null>(null);
  const [lineOpen, setLineOpen] = useState(false);

  const reminders = useMemo(
    () => (me ? leadReminders(data, isHead ? undefined : me.id) : []),
    [data, me, isHead],
  );

  if (!me) return null;

  // หน้าอาจ mount ก่อนรู้ว่าใครล็อกอิน จึงคำนวณแท็บเริ่มต้นตามบทบาทตอน render
  const allowed: Tab[] = isHead ? ["all", "pool", "closed"] : ["mine", "pool"];
  const tab: Tab = tabChoice && allowed.includes(tabChoice) ? tabChoice : allowed[0];
  const stats = data.settings.leads.lastScanStats;
  const pool = data.leads.filter((l) => l.status === "pool" || l.status === "requested");
  const list = data.leads.filter((l) => {
    if (tab === "mine") return l.ownerId === me.id && isOpen(l);
    if (tab === "all") return isOpen(l);
    if (tab === "pool") return l.status === "pool" || l.status === "requested";
    return l.status === "dismissed";
  });
  const todayCount = data.leads.filter(
    (l) => l.createdAt === toISODate(new Date()) && (isHead || l.ownerId === me.id),
  ).length;

  const tabs: { id: Tab; label: string; count: number }[] = isHead
    ? [
        { id: "all", label: "ทั้งทีม (เปิดอยู่)", count: data.leads.filter(isOpen).length },
        { id: "pool", label: "กองกลาง / คำขอ", count: pool.length },
        { id: "closed", label: "ไม่เหมาะ", count: data.leads.filter((l) => l.status === "dismissed").length },
      ]
    : [
        { id: "mine", label: "Lead ของฉัน", count: data.leads.filter((l) => l.ownerId === me.id && isOpen(l)).length },
        { id: "pool", label: "กองกลาง", count: pool.length },
      ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Target}
        title={isHead ? "New Lead ของทีม" : "My Leads"}
        subtitle={`Lead ใหม่วันนี้ ${todayCount} ราย · สแกนข่าวอัตโนมัติทุกวันหลัง 08:00`}
        actions={
          <>
            {isHead && (
              <button className="btn btn-ghost" onClick={() => setLineOpen(true)}>
                <Send size={16} /> ส่งสรุปเข้า LINE
              </button>
            )}
            <button className="btn btn-primary" onClick={() => void scan()} disabled={scanning}>
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <Radar size={16} />}
              {scanning ? "กำลังสแกนข่าว…" : "สแกนข่าวตอนนี้"}
            </button>
          </>
        }
      />

      {/* สถานะการสแกนล่าสุด */}
      <div className="card mb-4 p-4 text-sm">
        {scanning && (
          <div className="flex items-center gap-2 text-navy-700">
            <Loader2 size={16} className="animate-spin" /> กำลังอ่านข่าวจาก {data.settings.leads.sources.filter((s) => s.enabled).length} แหล่ง และคัด Lead… (10–60 วินาที)
          </div>
        )}
        {!scanning && error && <div className="text-red-700">สแกนไม่สำเร็จ: {error}</div>}
        {!scanning && lastAdded && (
          <div className="mb-2 flex items-center gap-2 text-green-700">
            <CheckCircle2 size={16} /> ได้ Lead ใหม่ {lastAdded.length} ราย (ตัดรายการซ้ำแล้ว) และแจกให้ทีมเรียบร้อย
          </div>
        )}
        {!scanning && stats ? (
          <div className="space-y-2">
            <div className="text-muted">
              สแกนล่าสุด {new Date(stats.at).toLocaleString("th-TH")} · อ่าน {stats.items} ข่าว · คัดได้ {stats.leads} Lead ·{" "}
              {stats.mode === "ai" ? "คัดด้วย Claude AI" : "คัดด้วยกฎพื้นฐาน (ใส่ API key เพื่อใช้ AI)"}
            </div>
            {stats.warning && <div className="text-amber-700">{stats.warning}</div>}
            <div className="flex flex-wrap gap-1.5">
              {stats.sources.map((s) => (
                <span
                  key={s.name}
                  className={`rounded-full px-2 py-0.5 text-xs ${s.ok ? "bg-sky-50 text-navy-700" : "bg-red-50 text-red-700"}`}
                  title={s.ok ? `${s.count} ข่าวใหม่ใน 48 ชม.` : "ดึงข่าวไม่สำเร็จ"}
                >
                  {s.ok ? "●" : "✕"} {s.name} {s.ok ? s.count : ""}
                </span>
              ))}
            </div>
          </div>
        ) : (
          !scanning && <div className="text-muted">ยังไม่เคยสแกน — กด &quot;สแกนข่าวตอนนี้&quot; หรือรอสแกนอัตโนมัติหลัง 08:00</div>
        )}
      </div>

      {reminders.length > 0 && (
        <div className="card mb-4 p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold text-navy-800">
            <AlarmClock size={18} className="text-warn" /> ต้องติดตาม ({reminders.length})
          </div>
          <ul className="space-y-1.5 text-sm">
            {reminders.map((r) => {
              const owner = data.users.find((u) => u.id === r.lead.ownerId);
              return (
                <li key={r.lead.id} className={`flex flex-wrap items-center gap-2 rounded-lg px-3 py-1.5 ${REMINDER_STYLE[r.kind]}`}>
                  {isHead && owner && <span className="font-semibold">{owner.nickname}</span>}
                  <span className="font-medium">{r.lead.brandName}</span>
                  <span>— {r.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === t.id ? "bg-navy-800 text-white" : "border border-line bg-white text-ink hover:bg-sky-50"}`}
          >
            {t.label} <span className="opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center text-sm text-muted">
          <Inbox size={28} />
          {tab === "pool" ? "กองกลางว่าง" : "ยังไม่มี Lead ในหมวดนี้"}
        </div>
      ) : (
        <div className="space-y-3">
          {list
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.score - a.score)
            .map((lead) => (
              <LeadCard key={lead.id} lead={lead} reminder={reminders.find((r) => r.lead.id === lead.id)} />
            ))}
        </div>
      )}

      {lineOpen && <LineModal onClose={() => setLineOpen(false)} />}
    </div>
  );
}

function LeadCard({ lead, reminder }: { lead: Lead; reminder?: LeadReminder }) {
  const { data, me, isHead, acceptLead, dismissLead, requestLead, assignLead } = useStore();
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState("");
  if (!me) return null;

  const owner = data.users.find((u) => u.id === lead.ownerId);
  const requester = data.users.find((u) => u.id === lead.requestedBy);
  const signal = SIGNAL_LABEL[lead.signal];
  const isMine = lead.ownerId === me.id;
  const age = leadAgeDays(lead);
  const suggestion = isHead && (lead.status === "pool" || lead.status === "requested" || lead.status === "assigned")
    ? recommendOwner(data, lead)
    : null;

  return (
    <div className="card p-4">
      <div className="flex gap-3">
        <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl ${scoreColor(lead.score)}`}>
          <span className="text-lg font-bold leading-none">{lead.score}</span>
          <span className="text-[9px] opacity-80">คะแนน</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-base font-semibold text-navy-800">{lead.brandName}</span>
            <Badge className="bg-sky-50 text-navy-700">
              {signal.icon} {signal.label}
            </Badge>
            <Badge className="bg-slate-100 text-slate-600">{lead.category}</Badge>
            {lead.status === "working" && <Badge className="bg-green-50 text-green-700">กำลังติดต่อ</Badge>}
            {lead.status === "requested" && <Badge className="bg-amber-50 text-amber-700">{requester?.nickname} ขอรับ</Badge>}
            {lead.status === "pool" && <Badge className="bg-slate-100 text-slate-700">กองกลาง</Badge>}
          </div>
          <div className="mt-1 text-sm text-ink">
            {lead.url ? (
              <a href={lead.url} target="_blank" rel="noopener noreferrer" className="hover:text-sky-500 hover:underline">
                {lead.headline} <ExternalLink size={12} className="inline" />
              </a>
            ) : (
              lead.headline
            )}
          </div>
          <div className="text-xs text-muted">
            {lead.source}
            {lead.publishedAt && ` · ${formatThaiDate(toISODate(new Date(lead.publishedAt)))}`}
          </div>
          <p className="mt-2 text-sm text-ink">{lead.reason}</p>
          <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-sm text-navy-700">
            <Lightbulb size={15} className="mt-0.5 shrink-0" /> {lead.contactAngle}
          </div>
          {lead.suggestedMedia.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {lead.suggestedMedia.map((m) => (
                <span key={m} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                  {m}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
            {owner && (
              <span className="flex items-center gap-1.5 text-muted">
                <Avatar user={owner} size={22} /> {owner.nickname} · ได้รับ {age} วัน
                {isOpen(lead) && age < RELEASE_DAYS && ` (คืนกองกลางใน ${RELEASE_DAYS - age} วันถ้าไม่มี Activity)`}
              </span>
            )}
            {reminder && <Badge className={REMINDER_STYLE[reminder.kind]}>⏰ {reminder.text}</Badge>}

            <div className="ml-auto flex flex-wrap gap-2">
              {/* เซลส์เจ้าของ Lead */}
              {isMine && lead.status === "assigned" && (
                <>
                  <button className="btn btn-ghost py-1.5" onClick={() => setDismissing(true)}>
                    ไม่เหมาะ
                  </button>
                  <button className="btn btn-primary py-1.5" onClick={() => acceptLead(lead.id)}>
                    เริ่มติดต่อ
                  </button>
                </>
              )}
              {isMine && lead.status === "working" && (
                <Link href="/activities" className="btn btn-ghost py-1.5">
                  บันทึก Activity
                </Link>
              )}
              {/* เซลส์ขอรับจากกองกลาง */}
              {!isHead && lead.status === "pool" && (
                <button className="btn btn-primary py-1.5" onClick={() => requestLead(lead.id)}>
                  ขอรับ Lead นี้
                </button>
              )}
              {!isHead && lead.status === "requested" && lead.requestedBy === me.id && (
                <span className="text-xs text-amber-700">รอ Head อนุมัติ</span>
              )}
              {/* Head */}
              {isHead && lead.status === "requested" && requester && (
                <button className="btn btn-primary py-1.5" onClick={() => assignLead(lead.id, requester.id)}>
                  อนุมัติให้ {requester.nickname}
                </button>
              )}
              {isHead && lead.status !== "dismissed" && (
                <select
                  className="input w-auto py-1.5 text-sm"
                  value={lead.ownerId ?? ""}
                  onChange={(e) => e.target.value && assignLead(lead.id, e.target.value)}
                  aria-label="มอบหมาย Lead"
                >
                  <option value="">— มอบหมายให้ —</option>
                  {data.users
                    .filter((u) => u.role === "sales")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nickname}
                        {u.onLeave ? " (ลา)" : ""}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </div>
          {suggestion && suggestion.user.id !== lead.ownerId && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              ระบบแนะนำ: <span className="font-semibold text-navy-700">{suggestion.user.nickname}</span> ({suggestion.reason})
              <button className="text-sky-500 hover:underline" onClick={() => assignLead(lead.id, suggestion.user.id)}>
                มอบให้ {suggestion.user.nickname}
              </button>
            </div>
          )}
          {dismissing && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                dismissLead(lead.id, reason.trim());
                setDismissing(false);
              }}
            >
              <input
                autoFocus
                className="input py-1.5 text-sm"
                placeholder="เหตุผล เช่น แบรนด์เล็กเกินไป / ไม่ใช้สื่อนอกบ้าน"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button className="btn btn-primary py-1.5">ยืนยัน</button>
              <button type="button" className="btn btn-ghost py-1.5" onClick={() => setDismissing(false)}>
                ยกเลิก
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function LineModal({ onClose }: { onClose: () => void }) {
  const { data } = useStore();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const today = toISODate(new Date());
  const added = data.leads.filter((l) => l.createdAt === today).sort((a, b) => b.score - a.score);
  const head = data.users.find((u) => u.role === "head");

  const messages = useMemo(() => {
    const team = buildTeamDigest(data, added, appUrl);
    const out: { label: string; to?: string; text: string }[] = [
      { label: head?.lineUserId ? `ถึง ${head.nickname} (Group Head)` : "Broadcast ถึงทุกคนใน LINE OA", to: head?.lineUserId, text: team },
    ];
    for (const u of data.users.filter((x) => x.role === "sales" && x.lineUserId)) {
      const text = buildPersonalDigest(data, u, added, appUrl);
      if (text) out.push({ label: `ถึง ${u.nickname}`, to: u.lineUserId, text });
    }
    return out;
  }, [data, added, appUrl, head]);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/line/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.map(({ to, text }) => ({ to, text })) }),
      });
      const json = (await res.json()) as { sent?: number; configured?: boolean; errors?: string[]; error?: string };
      if (json.configured === false) setResult("ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN — ดูวิธีใน README");
      else if (json.errors?.length) setResult(`ส่งได้ ${json.sent ?? 0} ข้อความ · ผิดพลาด: ${json.errors.join(", ")}`);
      else setResult(`ส่งแล้ว ${json.sent} ข้อความ`);
    } catch {
      setResult("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4">
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-800">ตัวอย่างข้อความ LINE</h2>
          <button onClick={onClose} aria-label="ปิด">
            <X size={20} />
          </button>
        </div>
        <p className="mb-3 text-xs text-muted">
          ระบบจริงจะส่งให้อัตโนมัติทุกเช้า 08:00 · ใส่ LINE userId ของแต่ละคนใน Settings เพื่อส่ง Lead ส่วนตัว
        </p>
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i}>
              <div className="mb-1 text-xs font-semibold text-muted">{m.label}</div>
              <pre className="whitespace-pre-wrap rounded-2xl bg-[#e8f8e8] p-3 font-sans text-sm text-ink">{m.text}</pre>
            </div>
          ))}
        </div>
        {result && <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-navy-700">{result}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            ปิด
          </button>
          <button className="btn btn-primary" onClick={send} disabled={sending}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} ส่ง {messages.length} ข้อความ
          </button>
        </div>
      </div>
    </div>
  );
}
