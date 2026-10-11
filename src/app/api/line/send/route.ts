import { sendLine, type LineMessage } from "@/lib/line";

/** ส่งข้อความเข้า LINE OA ของทีม (ปุ่มกดจากหน้า My Leads — ส่งเมื่อผู้ใช้สั่งเท่านั้น) */
export async function POST(request: Request) {
  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m): m is LineMessage => typeof m?.text === "string" && m.text.trim().length > 0)
    .slice(0, 10);
  if (messages.length === 0) return Response.json({ error: "ไม่มีข้อความ" }, { status: 400 });
  return Response.json(await sendLine(messages));
}
