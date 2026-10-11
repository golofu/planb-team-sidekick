"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import Avatar from "@/components/Avatar";

export default function LoginPage() {
  const { data, login, ready } = useStore();
  const router = useRouter();

  const choose = (id: string) => {
    login(id);
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4 py-10">
      <div className="card w-full max-w-md p-8 shadow-sm">
        <div className="text-center">
          <div className="text-3xl font-bold text-navy-800">
            Plan <span className="text-sky-400">•</span> B
          </div>
          <div className="text-xs font-semibold tracking-[0.25em] text-muted">TEAM SIDEKICK</div>
          <p className="mt-4 text-sm text-muted">ผู้ช่วย AI สำหรับ Group Head และ Sales Team</p>
        </div>

        <button
          disabled
          className="btn btn-ghost mt-6 w-full"
          title="เปิดใช้เมื่อเชื่อม Supabase + Google Workspace ของบริษัท"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Sign in with Google (@planbmedia.co.th)
        </button>
        <p className="mt-2 text-center text-xs text-muted">
          เปิดใช้หลังได้รับอนุญาตจาก IT และเชื่อม Google Workspace
        </p>

        <div className="my-6 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-line" />
          โหมดทดลอง: เลือกผู้ใช้
          <div className="h-px flex-1 bg-line" />
        </div>

        <div className="space-y-2">
          {ready &&
            data.users.map((u) => (
              <button
                key={u.id}
                onClick={() => choose(u.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition hover:border-sky-400 hover:bg-sky-50"
              >
                <Avatar user={u} size={38} />
                <div className="flex-1">
                  <div className="font-semibold text-navy-800">
                    {u.name} ({u.nickname})
                  </div>
                  <div className="text-xs text-muted">{u.categories.join(", ")}</div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.role === "head" ? "bg-navy-800 text-white" : "bg-sky-100 text-navy-700"}`}
                >
                  {u.role === "head" ? "Group Head" : "Sales"}
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
