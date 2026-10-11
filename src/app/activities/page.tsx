"use client";

import { useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { useStore } from "@/lib/store";
import { ACTIVITY_LABEL, ACTIVITY_TYPES, type ActivityType } from "@/lib/types";
import ActivityComposer from "@/components/ActivityComposer";
import ActivityList from "@/components/ActivityList";
import { PageHeader } from "@/components/ui";

export default function ActivitiesPage() {
  const { data, me, isHead } = useStore();
  const [owner, setOwner] = useState<string>("all");
  const [type, setType] = useState<ActivityType | "all">("all");
  const [limit, setLimit] = useState(40);

  const list = useMemo(() => {
    if (!me) return [];
    return data.activities.filter(
      (a) =>
        (isHead ? owner === "all" || a.userId === owner : a.userId === me.id) &&
        (type === "all" || a.type === type),
    );
  }, [data.activities, me, isHead, owner, type]);

  if (!me) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon={ListChecks}
        title="Activities"
        subtitle={isHead ? "Activity ของทุกคนในทีม — คอมเมนต์โค้ชได้ทันที" : "บันทึกและดูประวัติงานขายของคุณ"}
      />
      <ActivityComposer />
      <div className="mb-3 mt-6 flex flex-wrap items-center gap-2">
        {isHead && (
          <select className="input w-auto" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="all">ทุกคน</option>
            {data.users
              .filter((u) => u.role === "sales")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nickname}
                </option>
              ))}
          </select>
        )}
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value as ActivityType | "all")}>
          <option value="all">ทุกประเภท</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_LABEL[t]}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">{list.length} รายการ</span>
      </div>
      <ActivityList activities={list} showOwner={isHead} limit={limit} />
      {list.length > limit && (
        <button onClick={() => setLimit(limit + 40)} className="btn btn-ghost mt-3 w-full">
          โหลดเพิ่ม
        </button>
      )}
    </div>
  );
}
