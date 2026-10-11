import { scanLeads } from "@/lib/lead-scan";
import { buildCronDigest } from "@/lib/lead-logic";
import { sendLine } from "@/lib/line";

/**
 * เรียกทุกวัน 08:00 (เวลาไทย) โดย scheduler — ดู netlify/functions/daily-leads.mts
 * ต้องส่ง header: Authorization: Bearer <CRON_SECRET>
 * หมายเหตุ: ต้นแบบยังไม่มีฐานข้อมูลกลาง จึงส่งได้เฉพาะสรุป Lead ทั้งทีม (ยังแจกรายคนไม่ได้)
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { candidates, stats } = await scanLeads({});
  const text = buildCronDigest(candidates, process.env.APP_URL);
  const line = await sendLine([{ text }]);
  return Response.json({ stats, line });
}
