import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-800 text-white">
          <Icon size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy-800 md:text-2xl">{title}</h1>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  target,
  hint,
  pace,
}: {
  label: string;
  value: number | string;
  target?: number;
  hint?: string;
  /** ผลงานเทียบที่ควรทำได้ถึงตอนนี้ (จาก paceRatio) ใช้กำหนดสีแถบ */
  pace?: number;
}) {
  const pct = target && typeof value === "number" ? Math.min(100, Math.round((value / target) * 100)) : null;
  const level = pace ?? (pct ?? 0) / 100;
  return (
    <div className="card p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-navy-800">{value}</span>
        {target !== undefined && <span className="text-sm text-muted">/ {target}</span>}
      </div>
      {pct !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100">
          <div
            className={`h-full rounded-full ${level >= 0.9 ? "bg-ok" : level >= 0.6 ? "bg-sky-500" : "bg-warn"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

/** Markdown แบบเบาๆ สำหรับข้อความจาก AI Coach (หัวข้อ, bullet, ตัวหนา, ตัวเอียง) */
export function SimpleMarkdown({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) =>
      part.startsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("_") && part.endsWith("_") && part.length > 2 ? (
        <em key={i} className="text-muted">
          {part.slice(1, -1)}
        </em>
      ) : (
        part
      ),
    );
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={blocks.length}>
          {list.map((l, i) => (
            <li key={i}>{inline(l)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (/^[-*]\s+/.test(t)) {
      list.push(t.replace(/^[-*]\s+/, ""));
      continue;
    }
    if (/^\d+\.\s+/.test(t)) {
      list.push(t);
      continue;
    }
    flush();
    if (t.startsWith("### ")) blocks.push(<h3 key={blocks.length}>{inline(t.slice(4))}</h3>);
    else if (t.startsWith("## ")) blocks.push(<h2 key={blocks.length}>{inline(t.slice(3))}</h2>);
    else if (t.startsWith("# ")) blocks.push(<h2 key={blocks.length}>{inline(t.slice(2))}</h2>);
    else if (t) blocks.push(<p key={blocks.length}>{inline(t)}</p>);
  }
  flush();
  return <div className="prose-coach text-[15px] leading-relaxed">{blocks}</div>;
}
