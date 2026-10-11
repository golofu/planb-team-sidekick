"use client";

import { useState } from "react";
import { AlertTriangle, Bot, LayoutDashboard, Loader2, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { paceRatio, RAG_STYLE, staleDeals, teamKpis, weekRange } from "@/lib/kpi";
import { formatBaht, formatThaiDate, toISODate } from "@/lib/dates";
import { ACTIVITY_LABEL, STAGE_LABEL } from "@/lib/types";
import Avatar from "@/components/Avatar";
import { PageHeader, SimpleMarkdown } from "@/components/ui";
import type { CoachInput } from "@/app/api/coach/route";

function Cell({ value, target }: { value: number; target: number }) {
  // สีเทียบกับที่ควรทำได้ถึงตอนนี้ (pro-rata) ให้ตรงกับสถานะเขียว/เหลือง/แดง
  const pct = paceRatio(value, target);
  const color = pct >= 0.9 ? "text-green-700" : pct >= 0.6 ? "text-amber-700" : "text-red-700";
  return (
    <span className={`font-semibold ${color}`}>
      {value}
      <span className="font-normal text-muted">/{target}</span>
    </span>
  );
}

function Progress({ value, target }: { value: number; target: number }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="min-w-28">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-navy-800">{formatBaht(value)}</span>
        <span className="text-muted">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sky-100">
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { data, isHead, setCoachReport } = useStore();
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  if (!isHead) {
    return <div className="card mx-auto max-w-md p-8 text-center text-muted">หน้านี้สำหรับ Group Head เท่านั้น</div>;
  }

  const kpis = teamKpis(data);
  const stale = staleDeals(data);
  const { kpi } = data.settings;
  const { from, to } = weekRange();
  const weekLabel = `${formatThaiDate(toISODate(from))} – ${formatThaiDate(toISODate(to))}`;
  const totals = kpis.reduce(
    (s, k) => ({
      won: s.won + k.wonMonth,
      target: s.target + k.monthTarget,
      wonQ: s.wonQ + k.wonQuarter,
      targetQ: s.targetQ + k.quarterTarget,
      pipeline: s.pipeline + k.openPipeline,
    }),
    { won: 0, target: 0, wonQ: 0, targetQ: 0, pipeline: 0 },
  );

  const runCoach = async () => {
    setLoading(true);
    setWarning(null);
    const input: CoachInput = {
      weekLabel,
      targets: kpi,
      members: kpis.map((k) => ({
        name: k.user.nickname,
        categories: k.user.categories,
        rag: k.rag,
        newContacts: k.newContacts,
        meetings: k.meetings,
        proposals: k.proposals,
        wonMonth: k.wonMonth,
        monthTarget: k.monthTarget,
        openPipeline: k.openPipeline,
        lastActivityDate: k.lastActivityDate,
        recentActivities: data.activities
          .filter((a) => a.userId === k.user.id)
          .slice(0, 12)
          .map((a) => {
            const brand = data.brands.find((b) => b.id === a.brandId);
            return `${a.date} ${ACTIVITY_LABEL[a.type]}${brand ? ` ${brand.name}` : ""}: ${a.summary}`;
          }),
        staleDeals: stale
          .filter((s) => s.deal.ownerId === k.user.id)
          .map((s) => {
            const brand = data.brands.find((b) => b.id === s.deal.brandId);
            return `${brand?.name} "${s.deal.title}" ${formatBaht(s.deal.value)} ค้างขั้น ${STAGE_LABEL[s.deal.stage]} ${s.days} วัน`;
          }),
      })),
    };
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      setCoachReport({ text: json.text, source: json.source, createdAt: new Date().toISOString() });
      setWarning(json.warning ?? null);
    } catch {
      setWarning("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const report = data.coachReport;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={LayoutDashboard} title="Team Dashboard" subtitle={`สัปดาห์ ${weekLabel} · เป้าเทียบตามวันทำงานที่ผ่านไป`} />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-muted">ยอด Won ทีม เดือนนี้</div>
          <Progress value={totals.won} target={totals.target} />
          <div className="mt-1 text-xs text-muted">เป้า {formatBaht(totals.target)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted">ยอด Won ทีม ไตรมาสนี้</div>
          <Progress value={totals.wonQ} target={totals.targetQ} />
          <div className="mt-1 text-xs text-muted">เป้า {formatBaht(totals.targetQ)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted">Pipeline ที่เปิดอยู่</div>
          <div className="text-2xl font-bold text-navy-800">{formatBaht(totals.pipeline)}</div>
          <div className="text-xs text-muted">{data.deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length} deals</div>
        </div>
      </div>

      {/* KPI table (desktop) / cards (mobile) */}
      <div className="card mb-6 overflow-hidden">
        <div className="border-b border-line px-4 py-3 font-semibold text-navy-800">KPI รายคน — สัปดาห์นี้</div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-sky-50 text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2">เซลส์</th>
                <th className="px-3 py-2">สถานะ</th>
                <th className="px-3 py-2">ติดต่อใหม่</th>
                <th className="px-3 py-2">นัดพบ</th>
                <th className="px-3 py-2">Proposal</th>
                <th className="px-3 py-2">Pipeline ใหม่</th>
                <th className="px-3 py-2">Won เดือนนี้ / เป้า</th>
                <th className="px-3 py-2">Activity ล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {kpis.map((k) => {
                const rag = RAG_STYLE[k.rag];
                return (
                  <tr key={k.user.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar user={k.user} size={32} />
                        <div>
                          <div className="font-semibold text-navy-800">{k.user.nickname}</div>
                          <div className="text-xs text-muted">{k.user.categories.join(", ")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${rag.bg} ${rag.text}`}>
                        <span className={`h-2 w-2 rounded-full ${rag.dot}`} />
                        {rag.label}
                      </span>
                    </td>
                    <td className="px-3 py-3"><Cell value={k.newContacts} target={kpi.newContacts} /></td>
                    <td className="px-3 py-3"><Cell value={k.meetings} target={kpi.meetings} /></td>
                    <td className="px-3 py-3"><Cell value={k.proposals} target={kpi.proposals} /></td>
                    <td className="px-3 py-3">{formatBaht(k.pipelineCreated)}</td>
                    <td className="px-3 py-3"><Progress value={k.wonMonth} target={k.monthTarget} /></td>
                    <td className="px-3 py-3 text-xs text-muted">{k.lastActivityDate ? formatThaiDate(k.lastActivityDate) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-line md:hidden">
          {kpis.map((k) => {
            const rag = RAG_STYLE[k.rag];
            return (
              <div key={k.user.id} className="p-4">
                <div className="flex items-center gap-2">
                  <Avatar user={k.user} size={32} />
                  <div className="flex-1 font-semibold text-navy-800">{k.user.nickname}</div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${rag.bg} ${rag.text}`}>
                    <span className={`h-2 w-2 rounded-full ${rag.dot}`} />
                    {rag.label}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>ติดต่อใหม่<br /><Cell value={k.newContacts} target={kpi.newContacts} /></div>
                  <div>นัดพบ<br /><Cell value={k.meetings} target={kpi.meetings} /></div>
                  <div>Proposal<br /><Cell value={k.proposals} target={kpi.proposals} /></div>
                </div>
                <div className="mt-2"><Progress value={k.wonMonth} target={k.monthTarget} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-navy-800">
            <AlertTriangle size={18} className="text-bad" /> Deal ค้างนาน ({stale.length})
          </h2>
          {stale.length === 0 && <div className="text-sm text-muted">ไม่มี Deal ค้าง 🎉</div>}
          <ul className="space-y-2">
            {stale.map(({ deal, days, threshold }) => {
              const brand = data.brands.find((b) => b.id === deal.brandId);
              const owner = data.users.find((u) => u.id === deal.ownerId);
              return (
                <li key={deal.id} className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 p-3">
                  {owner && <Avatar user={owner} size={30} />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">
                      {brand?.name} · {formatBaht(deal.value)}
                    </div>
                    <div className="text-xs text-muted">
                      {STAGE_LABEL[deal.stage]} มา {days} วัน (เกณฑ์ {threshold} วัน)
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card p-4 lg:col-span-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold text-navy-800">
              <Bot size={18} className="text-sky-500" /> AI Coach — สรุปทีมประจำสัปดาห์
            </h2>
            <button className="btn btn-primary" onClick={runCoach} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {report ? "สรุปใหม่" : "สร้างสรุป"}
            </button>
          </div>
          <p className="mb-3 text-xs text-muted">
            ระบบจะสรุปให้อัตโนมัติทุกวันศุกร์ (เปิดใช้หลังเชื่อมเซิร์ฟเวอร์) — ตอนนี้กดสร้างเองได้ทุกเมื่อ
          </p>
          {warning && <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{warning}</div>}
          {loading && <div className="py-8 text-center text-sm text-muted">AI Coach กำลังวิเคราะห์ทีม… (อาจใช้เวลา 20-60 วินาที)</div>}
          {!loading && report && (
            <>
              <SimpleMarkdown text={report.text} />
              <div className="mt-3 text-xs text-muted">
                สร้างเมื่อ {new Date(report.createdAt).toLocaleString("th-TH")} · {report.source === "ai" ? "Claude AI" : "สรุปพื้นฐาน"}
              </div>
            </>
          )}
          {!loading && !report && (
            <div className="rounded-xl bg-sky-50 p-6 text-center text-sm text-navy-700">
              กด &quot;สร้างสรุป&quot; เพื่อให้ AI บอกว่าใครควรได้รับความช่วยเหลือ Deal ไหนต้องเข้าไปช่วยปิด และหัวข้อคุย 1:1
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
