"use client";

import { useState } from "react";
import { KanbanSquare, Plus, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { daysBetween, formatBaht, formatThaiDate } from "@/lib/dates";
import { MEDIA_FORMATS } from "@/lib/mock-data";
import { STAGE_LABEL, STAGES, visibleToSales, type Deal, type Stage } from "@/lib/types";
import Avatar from "@/components/Avatar";
import { PageHeader } from "@/components/ui";

const STAGE_ACCENT: Record<Stage, string> = {
  lead: "border-t-slate-300",
  contacted: "border-t-sky-400",
  meeting: "border-t-sky-500",
  proposal: "border-t-navy-600",
  negotiation: "border-t-navy-800",
  won: "border-t-ok",
  lost: "border-t-slate-400",
};

export default function PipelinePage() {
  const { data, me, isHead, moveDeal } = useStore();
  const [owner, setOwner] = useState("all");
  const [showLost, setShowLost] = useState(false);
  const [adding, setAdding] = useState(false);
  if (!me) return null;

  const deals = data.deals.filter((d) =>
    isHead ? owner === "all" || d.ownerId === owner : d.ownerId === me.id,
  );
  const stages = STAGES.filter((s) => showLost || s !== "lost");
  const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");

  return (
    <div>
      <PageHeader
        icon={KanbanSquare}
        title="Pipeline"
        subtitle={`Deal ที่เปิดอยู่ ${open.length} รายการ · มูลค่ารวม ${formatBaht(open.reduce((s, d) => s + d.value, 0))}`}
        actions={
          <>
            {isHead && (
              <select className="input w-auto" value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="all">ทั้งทีม</option>
                {data.users
                  .filter((u) => u.role === "sales")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nickname}
                    </option>
                  ))}
              </select>
            )}
            <button className="btn btn-ghost" onClick={() => setShowLost(!showLost)}>
              {showLost ? "ซ่อน Lost" : "แสดง Lost"}
            </button>
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              <Plus size={16} /> เพิ่ม Deal
            </button>
          </>
        }
      />

      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        {stages.map((stage) => {
          const col = deals.filter((d) => d.stage === stage);
          return (
            <div key={stage} className="w-[78vw] shrink-0 snap-start sm:w-72">
              <div className={`card mb-2 border-t-4 px-3 py-2 ${STAGE_ACCENT[stage]}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-navy-800">{STAGE_LABEL[stage]}</span>
                  <span className="text-xs text-muted">{col.length}</span>
                </div>
                <div className="text-xs text-muted">{formatBaht(col.reduce((s, d) => s + d.value, 0))}</div>
              </div>
              <div className="space-y-2">
                {col.map((d) => (
                  <DealCard key={d.id} deal={d} onMove={(s) => moveDeal(d.id, s)} showOwner={isHead} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {adding && <AddDealModal onClose={() => setAdding(false)} />}
    </div>
  );
}

function DealCard({ deal, onMove, showOwner }: { deal: Deal; onMove: (s: Stage) => void; showOwner: boolean }) {
  const { data, updateDeal } = useStore();
  const brand = data.brands.find((b) => b.id === deal.brandId);
  const owner = data.users.find((u) => u.id === deal.ownerId);
  const days = daysBetween(deal.stageChangedAt, new Date());
  const threshold = deal.stage === "proposal" ? data.settings.staleDays.proposal : data.settings.staleDays.other;
  const stale = deal.stage !== "won" && deal.stage !== "lost" && deal.stage !== "lead" && days >= threshold;

  return (
    <div className={`card p-3 ${stale ? "border-red-200 bg-red-50/40" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{brand?.name}</div>
          <div className="truncate text-sm text-muted">{deal.title}</div>
        </div>
        {showOwner && owner && <Avatar user={owner} size={26} />}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-navy-800">{formatBaht(deal.value)}</span>
        <span className={`text-xs ${stale ? "font-semibold text-red-700" : "text-muted"}`}>
          {stale ? "⚠ " : ""}
          {days} วันในขั้นนี้
        </span>
      </div>
      {brand?.agency && <div className="mt-1 text-xs text-muted">ผ่าน {brand.agency}</div>}
      {deal.nextStep && (
        <div className="mt-1.5 rounded-lg bg-sky-50 px-2 py-1 text-xs text-navy-700">
          ถัดไป: {deal.nextStep}
          {deal.nextStepDate && ` · ${formatThaiDate(deal.nextStepDate)}`}
        </div>
      )}
      <select
        className="input mt-2 py-1 text-xs"
        value={deal.stage}
        onChange={(e) => onMove(e.target.value as Stage)}
        aria-label="ย้ายขั้น"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            ย้ายไป: {STAGE_LABEL[s]}
          </option>
        ))}
      </select>
      {showOwner && (
        <select
          className="input mt-1.5 py-1 text-xs"
          value={deal.ownerId}
          onChange={(e) => updateDeal(deal.id, { ownerId: e.target.value })}
          aria-label="เปลี่ยนผู้รับผิดชอบ"
        >
          {data.users.map((u) => (
            <option key={u.id} value={u.id}>
              ผู้รับผิดชอบ: {u.nickname}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function AddDealModal({ onClose }: { onClose: () => void }) {
  const { data, me, isHead, addDeal } = useStore();
  const brands = isHead || !me ? data.brands : data.brands.filter(visibleToSales(me.id));
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState(0);
  const [stage, setStage] = useState<Stage>("lead");
  const [media, setMedia] = useState<string[]>([]);
  if (!me) return null;
  const brand = data.brands.find((b) => b.id === brandId);
  const ownerId = brand?.ownerId ?? me.id;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-800">เพิ่ม Deal</h2>
          <button onClick={onClose} aria-label="ปิด">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-muted">แบรนด์</span>
            <select className="input mt-1" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.agency ? ` · ${b.agency}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted">ชื่อแคมเปญ / Deal</span>
            <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-muted">มูลค่า (บาท)</span>
              <input
                type="number"
                className="input mt-1"
                value={value || ""}
                onChange={(e) => setValue(Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="text-muted">ขั้น</span>
              <select className="input mt-1" value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <span className="text-muted">สื่อ</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {MEDIA_FORMATS.map((m) => {
                const on = media.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => setMedia(on ? media.filter((x) => x !== m) : [...media, m])}
                    className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-navy-800 bg-navy-800 text-white" : "border-line"}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
          {isHead && (
            <p className="text-xs text-muted">
              ผู้รับผิดชอบ: {data.users.find((u) => u.id === ownerId)?.nickname ?? "-"} (ตามเจ้าของแบรนด์)
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            ยกเลิก
          </button>
          <button
            className="btn btn-primary"
            disabled={!title.trim()}
            onClick={() => {
              addDeal({
                brandId,
                ownerId: isHead ? ownerId : me.id,
                title: title.trim(),
                value,
                stage,
                media,
              });
              onClose();
            }}
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
