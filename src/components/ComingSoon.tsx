import { CheckCircle2, type LucideIcon } from "lucide-react";
import { PageHeader } from "./ui";

export default function ComingSoon({
  icon,
  title,
  subtitle,
  sprint,
  features,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  sprint: number;
  features: string[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={icon} title={title} subtitle={subtitle} />
      <div className="card p-6">
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-navy-700">
          กำลังพัฒนา · Sprint {sprint}
        </span>
        <h2 className="mt-4 font-semibold text-navy-800">สิ่งที่จะมีในหน้านี้</h2>
        <ul className="mt-3 space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[15px]">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-sky-500" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
