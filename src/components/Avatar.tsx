import type { User } from "@/lib/types";

export default function Avatar({ user, size = 32 }: { user: User; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ background: user.color, width: size, height: size, fontSize: size * 0.42 }}
      title={user.name}
    >
      {user.name.charAt(0)}
    </span>
  );
}
