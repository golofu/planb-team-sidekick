// Netlify Scheduled Function: ทุกวัน 08:00 เวลาไทย (01:00 UTC)
// เรียก /api/cron/daily-leads เพื่อสแกนข่าวและส่งสรุป Lead เข้า LINE OA
// ต้องตั้ง env บน Netlify: CRON_SECRET, LINE_CHANNEL_ACCESS_TOKEN, APP_URL (และ ANTHROPIC_API_KEY)
export default async () => {
  const base = process.env.APP_URL ?? process.env.URL;
  const res = await fetch(`${base}/api/cron/daily-leads`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log("daily-leads", res.status, await res.text());
};

export const config = { schedule: "0 1 * * *" };
