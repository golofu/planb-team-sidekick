"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, Home, Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeUserKpi, dueNextSteps, paceRatio, RAG_STYLE, staleDeals, teamKpis } from "@/lib/kpi";
import { formatBaht, formatThaiDate, relativeDay, toISODate } from "@/lib/dates";
import { STAGE_LABEL } from "@/lib/types";
import { isOpen, leadReminders } from "@/lib/lead-logic";
import { SIGNAL_LABEL } from "@/lib/types";
import ActivityComposer from "@/components/ActivityComposer";
import ActivityList from "@/components/ActivityList";
import Avatar from "@/components/Avatar";
import { PageHeader, StatCard } from "@/components/ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "สวัสดีตอนเช้า" : h < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
}

export default function HomePage() {
  const { data, me, isHead } = useStore();
  if (!me) return null;

  const { kpi } = data.settings;
  const myDeals = isHead ? data.deals : data.deals.filter((d) => d.ownerId === me.id);
  const due = dueNextSteps(myDeals);
  const myActivities = isHead ? data.activities : data.activities.filter((a) => a.userId === me.id);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={Home}
        title={`${greeting()}, ${me.nickname} 👋`}
        subtitle={isHead ? "ภาพรวมทีมและงานที่ต้องดูวันนี้" : "งานของคุณวันนี้และความคืบหน้าเทียบเป้าสัปดาห์นี้"}
      />

      {isHead ? <TeamSnapshot /> : <MyKpi />}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <ActivityComposer />
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-navy-800">Activity ล่าสุด{isHead && "ของทีม"}</h2>
              <Link href="/activities" className="text-sm text-sky-500 hover:underline">
                ดูทั้งหมด
              </Link>
            </div>
            <ActivityList activities={myActivities} showOwner={isHead} limit={6} />
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <LeadSummary />
          <div className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-navy-800">
              <CalendarClock size={18} className="text-sky-500" /> งานถัดไป (3 วันนี้)
            </h2>
            {due.length === 0 && <div className="text-sm text-muted">ไม่มีงานค้าง 🎉</div>}
            <ul className="space-y-2">
              {due.map((d) => {
                const brand = data.brands.find((b) => b.id === d.brandId);
                const owner = data.users.find((u) => u.id === d.ownerId);
                const overdue = d.nextStepDate! < toISODate(new Date());
                return (
                  <li key={d.id} className="flex items-start gap-2 rounded-xl border border-line p-3">
                    {isHead && owner && <Avatar user={owner} size={28} />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink">{d.nextStep}</div>
                      <div className="text-xs text-muted">
                        {brand?.name} · {STAGE_LABEL[d.stage]}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${overdue ? "bg-red-50 text-red-700" : "bg-sky-50 text-navy-700"}`}
                    >
                      {overdue ? "เลยกำหนด " : ""}
                      {relativeDay(d.nextStepDate!)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card p-4">
            <h2 className="mb-1 font-semibold text-navy-800">เป้าสัปดาห์นี้ (ต่อคน)</h2>
            <p className="text-sm text-muted">
              ติดต่อลูกค้าใหม่ {kpi.newContacts} · นัดพบ {kpi.meetings} · ส่ง Proposal {kpi.proposals}
            </p>
            <Link href="/pipeline" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-500">
              เปิด Pipeline <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MyKpi() {
  const { data, me } = useStore();
  if (!me) return null;
  const k = computeUserKpi(data, me);
  const rag = RAG_STYLE[k.rag];
  const { kpi } = data.settings;
  return (
    <div>
      <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${rag.bg} ${rag.text}`}>
        <span className={`h-2 w-2 rounded-full ${rag.dot}`} /> สถานะสัปดาห์นี้: {rag.label}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="ติดต่อลูกค้าใหม่" value={k.newContacts} target={kpi.newContacts} pace={paceRatio(k.newContacts, kpi.newContacts)} />
        <StatCard label="นัดพบ" value={k.meetings} target={kpi.meetings} pace={paceRatio(k.meetings, kpi.meetings)} />
        <StatCard label="ส่ง Proposal" value={k.proposals} target={kpi.proposals} pace={paceRatio(k.proposals, kpi.proposals)} />
        <StatCard
          label="ยอด Won เดือนนี้"
          value={formatBaht(k.wonMonth)}
          hint={`เป้า ${formatBaht(k.monthTarget)} · Pipeline ${formatBaht(k.openPipeline)}`}
        />
      </div>
    </div>
  );
}

function TeamSnapshot() {
  const { data } = useStore();
  const kpis = teamKpis(data);
  const stale = staleDeals(data);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {kpis.map((k) => {
        const rag = RAG_STYLE[k.rag];
        return (
          <Link key={k.user.id} href="/team" className="card flex items-center gap-3 p-3 hover:border-sky-400">
            <Avatar user={k.user} size={36} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-navy-800">{k.user.nickname}</div>
              <div className={`inline-flex items-center gap-1 text-xs ${rag.text}`}>
                <span className={`h-2 w-2 rounded-full ${rag.dot}`} /> {rag.label}
              </div>
            </div>
          </Link>
        );
      })}
      <Link href="/team" className="card flex items-center gap-3 bg-red-50/60 p-3 hover:border-red-300">
        <AlertTriangle className="text-bad" size={22} />
        <div>
          <div className="text-lg font-bold text-red-700">{stale.length}</div>
          <div className="text-xs text-red-700">Deal ค้างนาน</div>
        </div>
      </Link>
      <div className="col-span-full text-xs text-muted">
        อัปเดต {formatThaiDate(toISODate(new Date()))} · คลิกเพื่อดู Team Dashboard
      </div>
    </div>
  );
}

function LeadSummary() {
  const { data, me, isHead } = useStore();
  if (!me) return null;
  const today = toISODate(new Date());
  const visible = data.leads.filter((l) => isHead || l.ownerId === me.id);
  const fresh = visible.filter((l) => l.createdAt === today).sort((a, b) => b.score - a.score);
  const open = visible.filter(isOpen).length;
  const reminders = leadReminders(data, isHead ? undefined : me.id).length;
  const top = fresh[0];
  return (
    <Link href="/leads" className="card block p-4 hover:border-sky-400">
      <h2 className="mb-2 flex items-center gap-2 font-semibold text-navy-800">
        <Target size={18} className="text-sky-500" /> New Lead {isHead ? "ของทีม" : "ของฉัน"}
      </h2>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-sky-50 py-2">
          <div className="text-xl font-bold text-navy-800">{fresh.length}</div>
          <div className="text-xs text-muted">ใหม่วันนี้</div>
        </div>
        <div className="rounded-xl bg-sky-50 py-2">
          <div className="text-xl font-bold text-navy-800">{open}</div>
          <div className="text-xs text-muted">เปิดอยู่</div>
        </div>
        <div className={`rounded-xl py-2 ${reminders ? "bg-amber-50" : "bg-sky-50"}`}>
          <div className={`text-xl font-bold ${reminders ? "text-amber-700" : "text-navy-800"}`}>{reminders}</div>
          <div className="text-xs text-muted">ต้องติดตาม</div>
        </div>
      </div>
      {top && (
        <div className="mt-3 text-sm text-ink">
          🔥 สูงสุดวันนี้: <span className="font-semibold">{top.brandName}</span> ({top.score}) {SIGNAL_LABEL[top.signal].icon}
        </div>
      )}
    </Link>
  );
}
