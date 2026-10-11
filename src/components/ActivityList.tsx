"use client";

import { useState } from "react";
import { MessageSquarePlus, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatThaiDate, relativeDay } from "@/lib/dates";
import { ACTIVITY_LABEL, STAGE_LABEL, type Activity } from "@/lib/types";
import Avatar from "./Avatar";
import { Badge } from "./ui";

const TYPE_COLOR: Record<Activity["type"], string> = {
  call: "bg-sky-100 text-navy-700",
  line: "bg-green-100 text-green-700",
  email: "bg-slate-100 text-slate-700",
  meeting: "bg-indigo-100 text-indigo-700",
  proposal: "bg-amber-100 text-amber-700",
  other: "bg-slate-100 text-slate-600",
};

export default function ActivityList({
  activities,
  showOwner,
  limit,
}: {
  activities: Activity[];
  showOwner?: boolean;
  limit?: number;
}) {
  const { data, isHead, me, addNote } = useStore();
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const list = limit ? activities.slice(0, limit) : activities;

  if (list.length === 0) {
    return <div className="card p-6 text-center text-sm text-muted">ยังไม่มี Activity</div>;
  }

  return (
    <div className="card divide-y divide-line">
      {list.map((a) => {
        const user = data.users.find((u) => u.id === a.userId);
        const brand = data.brands.find((b) => b.id === a.brandId);
        const notes = data.notes.filter((n) => n.activityId === a.id);
        return (
          <div key={a.id} className="flex gap-3 px-4 py-3">
            {showOwner && user && <Avatar user={user} size={34} />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                {showOwner && user && <span className="font-semibold text-navy-800">{user.nickname}</span>}
                <Badge className={TYPE_COLOR[a.type]}>{ACTIVITY_LABEL[a.type]}</Badge>
                {brand && <span className="font-medium text-ink">{brand.name}</span>}
                {a.isNewContact && <Badge className="bg-sky-500 text-white">ลูกค้าใหม่</Badge>}
                {a.stageAfter && <Badge className="bg-navy-800/10 text-navy-800">→ {STAGE_LABEL[a.stageAfter]}</Badge>}
                <span className="ml-auto text-xs text-muted">
                  {formatThaiDate(a.date)} · {relativeDay(a.date)}
                </span>
              </div>
              <div className="mt-0.5 text-[15px] text-ink">{a.summary}</div>
              {a.nextStep && (
                <div className="mt-0.5 text-xs text-muted">
                  ถัดไป: {a.nextStep}
                  {a.nextStepDate && ` (${formatThaiDate(a.nextStepDate)})`}
                </div>
              )}
              {notes.map((n) => (
                <div key={n.id} className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-sm text-navy-700">
                  💬 <span className="font-semibold">โค้ช:</span> {n.text}
                </div>
              ))}
              {isHead && me && a.userId !== me.id && (
                <>
                  {noteFor === a.id ? (
                    <form
                      className="mt-2 flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!noteText.trim()) return;
                        addNote({ authorId: me.id, activityId: a.id, text: noteText.trim() });
                        setNoteText("");
                        setNoteFor(null);
                      }}
                    >
                      <input
                        autoFocus
                        className="input py-1.5 text-sm"
                        placeholder="คอมเมนต์โค้ชให้ลูกทีม…"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                      />
                      <button className="btn btn-primary px-3 py-1.5" aria-label="ส่ง">
                        <Send size={14} />
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setNoteFor(a.id)}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-sky-500 hover:underline"
                    >
                      <MessageSquarePlus size={13} /> คอมเมนต์โค้ช
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
