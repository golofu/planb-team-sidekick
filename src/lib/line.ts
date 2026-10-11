import "server-only";

export interface LineMessage {
  /** LINE userId — ถ้าไม่ระบุ จะ broadcast ถึงทุกคนที่เพิ่มเพื่อน OA */
  to?: string;
  text: string;
}

export interface LineResult {
  sent: number;
  configured: boolean;
  errors: string[];
}

/** ส่งผ่าน LINE Messaging API (LINE Notify ปิดบริการแล้ว) */
export async function sendLine(messages: LineMessage[]): Promise<LineResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { sent: 0, configured: false, errors: ["ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN"] };

  let sent = 0;
  const errors: string[] = [];
  for (const m of messages) {
    const endpoint = m.to ? "push" : "broadcast";
    const res = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...(m.to ? { to: m.to } : {}),
        messages: [{ type: "text", text: m.text.slice(0, 5000) }],
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch((e: unknown) => e as Error);
    if (res instanceof Error) errors.push(res.message);
    else if (!res.ok) errors.push(`LINE ${endpoint} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    else sent++;
  }
  return { sent, configured: true, errors };
}
