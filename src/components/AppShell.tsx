"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  Home,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Presentation,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useDailyAutoScan } from "@/lib/use-lead-scan";
import { leadReminders } from "@/lib/lead-logic";
import Avatar from "./Avatar";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  headOnly?: boolean;
  sprint?: number;
}

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/leads", label: "My Leads", icon: Target },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/activities", label: "Activities", icon: ListChecks },
  { href: "/team", label: "Team Dashboard", icon: LayoutDashboard, headOnly: true },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles, sprint: 3 },
  { href: "/pitch", label: "Pitch Studio", icon: Presentation, sprint: 4 },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen, sprint: 3 },
  { href: "/settings", label: "Settings", icon: Settings, headOnly: true },
];

const MOBILE_NAV = ["/", "/activities", "/pipeline", "/team", "/leads"];

export default function AppShell({ children }: { children: ReactNode }) {
  const { ready, me, isHead, logout, data } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const isLogin = pathname === "/login";
  useDailyAutoScan();

  useEffect(() => {
    if (ready && !me && !isLogin) router.replace("/login");
  }, [ready, me, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!ready || !me) {
    // ยัง render หน้าไว้ (หน้าเว็บคืนค่าว่างจนกว่าข้อมูลจาก localStorage จะพร้อม)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        กำลังโหลด…
        <div hidden>{children}</div>
      </div>
    );
  }

  const items = NAV.filter((n) => !n.headOnly || isHead);
  // แจ้งเตือน: Lead ใกล้ครบ 7/15 วัน (+ คำขอรับ Lead สำหรับ Head)
  const alertCount =
    leadReminders(data, isHead ? undefined : me.id).length +
    (isHead ? data.leads.filter((l) => l.status === "requested").length : 0);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-white md:flex ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          {!collapsed && (
            <div>
              <div className="text-2xl font-bold text-navy-800">
                Plan <span className="text-sky-400">•</span> B
              </div>
              <div className="text-[11px] font-semibold tracking-[0.2em] text-muted">TEAM SIDEKICK</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-1 text-muted hover:bg-sky-50"
            aria-label="ย่อ/ขยายเมนู"
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto border-t border-line px-3 pt-4">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition ${
                  active ? "bg-navy-800 font-semibold text-white" : "text-ink hover:bg-sky-50"
                }`}
              >
                <Icon size={20} className={active ? "text-white" : "text-muted"} />
                {!collapsed && (
                  <span className="flex flex-1 items-center justify-between">
                    {item.label}
                    {item.sprint && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${active ? "bg-white/20" : "bg-sky-100 text-navy-600"}`}
                      >
                        เร็วๆ นี้
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-muted hover:bg-sky-50"
          >
            <LogOut size={20} />
            {!collapsed && "ออกจากระบบ / สลับผู้ใช้"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="text-lg font-bold text-navy-800 md:hidden">
            Plan <span className="text-sky-400">•</span> B
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <Link
              href="/leads"
              className="relative rounded-full p-2 text-navy-700 hover:bg-sky-50"
              aria-label={`แจ้งเตือน ${alertCount} รายการ`}
              title="Lead ที่ต้องติดตาม"
            >
              <Bell size={20} />
              {alertCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bad px-1 text-[11px] font-bold text-white">
                  {alertCount}
                </span>
              )}
            </Link>
            <div className="text-right leading-tight">
              <div className="text-sm font-semibold text-navy-800">
                {me.name} ({me.nickname})
              </div>
              <div className="text-xs text-muted">{isHead ? "Group Head" : "Sales"}<span className="hidden sm:inline"> · {me.email}</span></div>
            </div>
            <Avatar user={me} size={40} />
            <button onClick={logout} className="rounded-lg p-1.5 text-muted hover:bg-sky-50 md:hidden" aria-label="ออกจากระบบ">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white md:hidden">
        {items
          .filter((i) => MOBILE_NAV.includes(i.href))
          .map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "font-semibold text-navy-800" : "text-muted"}`}
              >
                <Icon size={22} />
                {item.label.replace("Team Dashboard", "Team")}
              </Link>
            );
          })}
      </nav>
    </div>
  );
}
