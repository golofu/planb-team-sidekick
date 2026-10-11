import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { aiConfigured, describeAiError, FAST_MODEL, getClient } from "@/lib/ai";
import { parseActivityByRules } from "@/lib/parse-rules";
import { MEDIA_FORMATS } from "@/lib/mock-data";
import { ACTIVITY_TYPES, STAGES, type ParsedActivity } from "@/lib/types";
import { parseISODate } from "@/lib/dates";

const ParsedSchema = z.object({
  brandName: z.string(),
  matchedBrandId: z.string(),
  type: z.enum(ACTIVITY_TYPES),
  summary: z.string(),
  isNewContact: z.boolean(),
  stage: z.enum([...STAGES, "unchanged"]),
  nextStep: z.string(),
  nextStepDate: z.string(),
  dealValue: z.number(),
  media: z.array(z.string()),
});

const SYSTEM = `คุณคือผู้ช่วยบันทึกงานขายของทีม Sales สื่อโฆษณานอกบ้าน (OOH) ของ Plan B Media
หน้าที่: แปลงข้อความสั้นๆ ที่เซลส์พิมพ์หรือพูด ให้เป็นข้อมูล Activity ที่มีโครงสร้าง

กติกา
- matchedBrandId: เลือก id จากรายชื่อแบรนด์ที่ให้ ถ้าไม่ตรงกับแบรนด์ใดเลยให้เป็น "" และใส่ชื่อที่ได้ยินใน brandName
- type: call=โทร, line=คุยทาง LINE, email=อีเมล, meeting=เข้าพบ/ประชุม/รับ brief/present, proposal=ส่ง proposal หรือใบเสนอราคา, other=อื่นๆ
- summary: สรุปเป็นภาษาไทย 1 ประโยคสั้น กระชับ เป็นมืออาชีพ
- isNewContact: true เมื่อเป็นการติดต่อลูกค้าใหม่ครั้งแรก หรือแบรนด์ที่ไม่อยู่ในรายชื่อ
- stage: ขั้นของดีลหลังจาก activity นี้ (lead, contacted, meeting, proposal, negotiation, won, lost) หรือ "unchanged" ถ้าไม่ชัด
- nextStep: งานถัดไปที่เซลส์ต้องทำ (ภาษาไทยสั้นๆ) หรือ "" ถ้าไม่มี
- nextStepDate: วันที่ของงานถัดไปรูปแบบ YYYY-MM-DD คำนวณจากวันนี้ เช่น "ศุกร์นี้" "พรุ่งนี้" หรือ "" ถ้าไม่ระบุ
- dealValue: มูลค่าดีลเป็นบาท ถ้ามีการพูดถึง (เช่น 3 ล้าน = 3000000) ไม่งั้น 0
- media: เลือกเฉพาะจากรายการสื่อที่ให้ ที่ลูกค้าสนใจ`;

const MAX_TEXT = 2000;
const MAX_BRANDS = 300;

export async function POST(request: Request) {
  let body: { text?: unknown; brands?: unknown; today?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return Response.json({ error: "กรุณาพิมพ์ข้อความ" }, { status: 400 });
  if (text.length > MAX_TEXT) {
    return Response.json({ error: `ข้อความยาวเกิน ${MAX_TEXT} ตัวอักษร` }, { status: 400 });
  }
  const brands = (Array.isArray(body.brands) ? body.brands : [])
    .slice(0, MAX_BRANDS)
    .filter((b): b is { id: string; name: string; agency?: string } =>
      typeof b?.id === "string" && typeof b?.name === "string",
    )
    .map((b) => ({ id: b.id, name: b.name.slice(0, 100), agency: b.agency?.slice(0, 100) }));

  // ใช้วันที่ของเครื่องผู้ใช้ (เวลาไทย) ไม่ใช่เวลาเซิร์ฟเวอร์ ซึ่งมักเป็น UTC
  const todayISO =
    typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
      ? body.today
      : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const todayDate = parseISODate(todayISO);

  if (!aiConfigured()) {
    return Response.json({ source: "rules", result: parseActivityByRules(text, brands, todayDate) });
  }

  const today = todayDate.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const response = await getClient().messages.parse({
      model: FAST_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(ParsedSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `วันนี้: ${today} (ISO ${todayISO})
แบรนด์ในระบบ: ${JSON.stringify(brands)}
รายการสื่อ: ${JSON.stringify(MEDIA_FORMATS)}

ข้อความจากเซลส์:
"""${text}"""`,
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({
        source: "rules",
        warning: "AI แปลงข้อความไม่สำเร็จ ใช้ตัวแปลงสำรองแทน",
        result: parseActivityByRules(text, brands, todayDate),
      });
    }

    const result: ParsedActivity = response.parsed_output;
    if (result.matchedBrandId && !brands.some((b) => b.id === result.matchedBrandId)) {
      result.matchedBrandId = "";
    }
    result.media = result.media.filter((m) => MEDIA_FORMATS.includes(m));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.nextStepDate)) result.nextStepDate = "";
    return Response.json({ source: "ai", result });
  } catch (error) {
    return Response.json({
      source: "rules",
      warning: `${describeAiError(error)} — ใช้ตัวแปลงสำรองแทน`,
      result: parseActivityByRules(text, brands, todayDate),
    });
  }
}
