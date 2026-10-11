"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Mic, MicOff, Sparkles, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { MEDIA_FORMATS } from "@/lib/mock-data";
import { toISODate } from "@/lib/dates";
import {
  ACTIVITY_LABEL,
  ACTIVITY_TYPES,
  STAGE_LABEL,
  STAGES,
  type ActivityType,
  type ParsedActivity,
  type Stage,
  visibleToSales,
} from "@/lib/types";

// Web Speech API (Chrome/Edge/Safari) — ยังไม่มี type ใน lib.dom
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const EXAMPLES = [
  "เพิ่งออกจากออฟฟิศ Krungthep EV ลูกค้าสนใจป้ายทางด่วนกับจอในห้าง งบประมาณ 6 ล้าน ต้องส่ง mockup ศุกร์นี้",
  "โทรหา Mookata King ครั้งแรก แนะนำจอ BTS เจ้าของสนใจ นัดเข้าพบพรุ่งนี้",
  "ส่ง proposal ฉบับแก้ไขให้ Siam Fresh Drinks แล้ว รอคำตอบวันจันทร์",
];

export default function ActivityComposer({ onSaved }: { onSaved?: () => void }) {
  const { data, me, addActivity } = useStore();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState<ParsedActivity | null>(null);
  const [source, setSource] = useState<"ai" | "rules" | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [dealChoice, setDealChoice] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- feature-detect after mount (no SSR window)
  useEffect(() => setSpeechSupported(getRecognition() !== null), []);

  if (!me) return null;

  // Sales เห็นเฉพาะแบรนด์/Deal ของตัวเอง + แบรนด์กองกลาง (ยังไม่มีเจ้าของ), Head เห็นทั้งหมด
  const isHead = me.role === "head";
  const myBrands = isHead ? data.brands : data.brands.filter(visibleToSales(me.id));
  const brandDeals = (brandId: string) =>
    data.deals.filter(
      (d) =>
        d.brandId === brandId &&
        d.stage !== "won" &&
        d.stage !== "lost" &&
        (isHead || d.ownerId === me.id),
    );

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    rec.lang = "th-TH";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setText((t) => (t ? `${t} ${transcript}` : transcript));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setWarning(null);
    setSaved(false);
    try {
      const res = await fetch("/api/parse-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          today: toISODate(new Date()),
          brands: myBrands.map((b) => ({ id: b.id, name: b.name, agency: b.agency })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ผิดพลาด");
      const result = json.result as ParsedActivity;
      setDraft(result);
      setSource(json.source);
      setWarning(json.warning ?? null);
      const deals = result.matchedBrandId ? brandDeals(result.matchedBrandId) : [];
      setDealChoice(deals[0]?.id ?? (result.matchedBrandId ? "new" : ""));
    } catch (e) {
      setWarning(e instanceof Error ? e.message : "ผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!draft) return;
    const brandId = draft.matchedBrandId || undefined;
    const stage = draft.stage === "unchanged" ? undefined : draft.stage;
    const brand = data.brands.find((b) => b.id === brandId);
    addActivity(
      {
        userId: me.id,
        brandId,
        type: draft.type,
        summary: brandId ? draft.summary : `${draft.summary}${draft.brandName ? ` [${draft.brandName}]` : ""}`,
        rawText: text,
        date: toISODate(new Date()),
        isNewContact: draft.isNewContact,
        stageAfter: stage,
        nextStep: draft.nextStep || undefined,
        nextStepDate: draft.nextStepDate || undefined,
      },
      dealChoice === "new" && brand
        ? {
            newDeal: {
              brandId: brand.id,
              ownerId: me.role === "head" ? (brand.ownerId ?? me.id) : me.id,
              title: draft.summary.slice(0, 60),
              value: draft.dealValue,
              stage: stage ?? "contacted",
              media: draft.media,
              nextStep: draft.nextStep || undefined,
              nextStepDate: draft.nextStepDate || undefined,
            },
          }
        : dealChoice
          ? {
              dealId: dealChoice,
              stage,
              nextStep: draft.nextStep || undefined,
              nextStepDate: draft.nextStepDate || undefined,
            }
          : undefined,
    );
    setDraft(null);
    setText("");
    setSaved(true);
    onSaved?.();
  };

  const set = <K extends keyof ParsedActivity>(k: K, v: ParsedActivity[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div className="card p-4 md:p-5">
      <div className="mb-2 flex items-center gap-2 font-semibold text-navy-800">
        <Sparkles size={18} className="text-sky-500" /> บันทึก Activity — พิมพ์หรือพูดเหมือนเล่าให้หัวหน้าฟัง
      </div>
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={`เช่น "${EXAMPLES[0]}"`}
          className="input resize-none pr-14 text-[15px]"
        />
        {speechSupported && (
          <button
            onClick={toggleMic}
            className={`absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full ${listening ? "animate-pulse bg-bad text-white" : "bg-sky-100 text-navy-700"}`}
            aria-label={listening ? "หยุดฟัง" : "พูดแทนพิมพ์"}
            title={listening ? "หยุดฟัง" : "พูดแทนพิมพ์ (ภาษาไทย)"}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.slice(1).map((ex) => (
            <button
              key={ex}
              onClick={() => setText(ex)}
              className="rounded-full bg-sky-50 px-2.5 py-1 text-xs text-navy-600 hover:bg-sky-100"
            >
              ตัวอย่าง: {ex.slice(0, 28)}…
            </button>
          ))}
        </div>
        <button onClick={analyze} disabled={loading || !text.trim()} className="btn btn-primary">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          ให้ AI จัดให้
        </button>
      </div>

      {saved && !draft && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
          <Check size={16} /> บันทึกแล้ว อัปเดต Pipeline และ KPI ให้อัตโนมัติ
        </div>
      )}
      {warning && <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{warning}</div>}

      {draft && (
        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-navy-800">
              ตรวจสอบก่อนบันทึก{" "}
              <span className="font-normal text-muted">
                ({source === "ai" ? "AI จัดให้" : "ตัวแปลงพื้นฐาน — ใส่ API key เพื่อใช้ AI"})
              </span>
            </div>
            <button onClick={() => setDraft(null)} className="text-muted hover:text-ink" aria-label="ยกเลิก">
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-muted">ลูกค้า / แบรนด์</span>
              <select
                className="input mt-1"
                value={draft.matchedBrandId}
                onChange={(e) => {
                  set("matchedBrandId", e.target.value);
                  const deals = e.target.value ? brandDeals(e.target.value) : [];
                  setDealChoice(deals[0]?.id ?? (e.target.value ? "new" : ""));
                }}
              >
                <option value="">— ลูกค้าใหม่ / ไม่อยู่ในระบบ {draft.brandName && `(${draft.brandName})`} —</option>
                {myBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.agency ? ` · ${b.agency}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted">Deal</span>
              <select
                className="input mt-1"
                value={dealChoice}
                onChange={(e) => setDealChoice(e.target.value)}
                disabled={!draft.matchedBrandId}
              >
                <option value="">— ไม่ผูกกับ Deal —</option>
                {draft.matchedBrandId &&
                  brandDeals(draft.matchedBrandId).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                {draft.matchedBrandId && <option value="new">+ สร้าง Deal ใหม่</option>}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted">ประเภท</span>
              <select
                className="input mt-1"
                value={draft.type}
                onChange={(e) => set("type", e.target.value as ActivityType)}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACTIVITY_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted">ขั้นของ Deal หลังจากนี้</span>
              <select
                className="input mt-1"
                value={draft.stage}
                onChange={(e) => set("stage", e.target.value as Stage | "unchanged")}
              >
                <option value="unchanged">ไม่เปลี่ยน</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">สรุป</span>
              <input className="input mt-1" value={draft.summary} onChange={(e) => set("summary", e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="text-muted">งานถัดไป</span>
              <input
                className="input mt-1"
                value={draft.nextStep}
                placeholder="—"
                onChange={(e) => set("nextStep", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">กำหนดวัน</span>
              <input
                type="date"
                className="input mt-1"
                value={draft.nextStepDate}
                onChange={(e) => set("nextStepDate", e.target.value)}
              />
            </label>
            {dealChoice === "new" && (
              <label className="text-sm">
                <span className="text-muted">มูลค่า Deal (บาท)</span>
                <input
                  type="number"
                  className="input mt-1"
                  value={draft.dealValue || ""}
                  onChange={(e) => set("dealValue", Number(e.target.value))}
                />
              </label>
            )}
            <div className="text-sm sm:col-span-2">
              <span className="text-muted">สื่อที่ลูกค้าสนใจ</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {MEDIA_FORMATS.map((m) => {
                  const on = draft.media.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => set("media", on ? draft.media.filter((x) => x !== m) : [...draft.media, m])}
                      className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-ink"}`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.isNewContact}
                onChange={(e) => set("isNewContact", e.target.checked)}
                className="h-4 w-4 accent-navy-800"
              />
              นับเป็นการติดต่อลูกค้าใหม่ (KPI)
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDraft(null)} className="btn btn-ghost">
              ยกเลิก
            </button>
            <button onClick={save} className="btn btn-primary">
              <Check size={16} /> บันทึก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
