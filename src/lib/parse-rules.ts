// ตัวแปลงข้อความ Activity แบบกฎ (ใช้เมื่อยังไม่ได้ใส่ ANTHROPIC_API_KEY หรือ AI ล่ม)
import type { ActivityType, Brand, ParsedActivity, Stage } from "./types";
import { MEDIA_FORMATS } from "./mock-data";
import { addDays, toISODate } from "./dates";

const TYPE_RULES: [RegExp, ActivityType][] = [
  [/proposal|โพรโพซัล|ใบเสนอ/i, "proposal"],
  [/เข้าพบ|ไปพบ|เจอลูกค้า|ประชุม|meeting|brief|บรีฟ|present|ออกจากออฟฟิศ/i, "meeting"],
  [/อีเมล|เมล|e-?mail/i, "email"],
  [/ไลน์|line/i, "line"],
  [/โทร|call/i, "call"],
];

const STAGE_RULES: [RegExp, Stage][] = [
  [/ไม่เอา|ไม่สนใจ|ยกเลิก|lost|แพ้/i, "lost"],
  [/ปิดได้|ได้ po|ได้ PO|เซ็นสัญญา|confirm|won|ปิดดีล/i, "won"],
  [/ต่อรอง|ส่วนลด|negotiat/i, "negotiation"],
  [/proposal|ใบเสนอ/i, "proposal"],
  [/เข้าพบ|ประชุม|brief|บรีฟ|นัดพบ/i, "meeting"],
];

const MEDIA_RULES: [RegExp, string][] = [
  [/bts/i, "BTS Station Digital"],
  [/mrt/i, "MRT Digital Screen"],
  [/ห้าง|mall/i, "Mall Digital Screen"],
  [/ทางด่วน|billboard|บิลบอร์ด/i, "Billboard ทางด่วน"],
  [/สนามบิน|airport/i, "Airport Digital"],
  [/รถเมล์|bus/i, "Bus Wrap"],
  [/อาคาร|office|ออฟฟิศบิลดิ้ง/i, "Office Building Screen"],
];

const DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

function findDate(text: string, today: Date): string {
  if (/พรุ่งนี้/.test(text)) return toISODate(addDays(today, 1));
  if (/มะรืน/.test(text)) return toISODate(addDays(today, 2));
  if (/สัปดาห์หน้า|อาทิตย์หน้า/.test(text)) return toISODate(addDays(today, 7));
  for (let i = 0; i < DAY_NAMES.length; i++) {
    if (text.includes(DAY_NAMES[i]) && !(i === 0 && /อาทิตย์หน้า/.test(text))) {
      let diff = (i - today.getDay() + 7) % 7;
      // "ศุกร์นี้" ในวันศุกร์ = วันนี้, "ศุกร์" เฉยๆ ในวันศุกร์ = ศุกร์หน้า
      if (diff === 0 && !text.includes(`${DAY_NAMES[i]}นี้`)) diff = 7;
      return toISODate(addDays(today, diff));
    }
  }
  return "";
}

export function parseActivityByRules(
  text: string,
  brands: Pick<Brand, "id" | "name">[],
  today = new Date(),
): ParsedActivity {
  const lower = text.toLowerCase();
  const brand = brands.find((b) => {
    const name = b.name.toLowerCase();
    return lower.includes(name) || lower.includes(name.split(" ")[0]);
  });
  // ใช้คำที่ปรากฏก่อนสุด เช่น "โทรหา... นัดเข้าพบพรุ่งนี้" = โทร (การนัดพบเป็นงานถัดไป)
  const type =
    TYPE_RULES.map(([re, t]) => ({ t, i: text.search(re) }))
      .filter((m) => m.i >= 0)
      .sort((a, b) => a.i - b.i)[0]?.t ?? "other";
  let stage: Stage | "unchanged" = STAGE_RULES.find(([re]) => re.test(text))?.[1] ?? "unchanged";
  // โทร/LINE/อีเมลเพื่อนัดพบ = เพิ่งติดต่อ ยังไม่ได้เข้าพบจริง
  if (stage === "meeting" && (type === "call" || type === "line" || type === "email")) stage = "contacted";
  const media = MEDIA_RULES.filter(([re]) => re.test(text)).map(([, m]) => m);

  const valueMatch = text.match(/(\d+(?:\.\d+)?)\s*(ล้าน|m\b|M\b)/);
  const dealValue = valueMatch ? Math.round(parseFloat(valueMatch[1]) * 1_000_000) : 0;

  const nextMatch = text.match(/(?:ต่อไป|next step|จะ|ต้อง|นัด)\s*([^,.。\n]+)/i);
  const nextStep = nextMatch ? nextMatch[0].trim() : "";

  return {
    brandName: brand?.name ?? "",
    matchedBrandId: brand?.id ?? "",
    type,
    summary: text.length > 120 ? `${text.slice(0, 117)}...` : text,
    isNewContact: /ลูกค้าใหม่|แนะนำตัว|ครั้งแรก|first/i.test(text) || (!brand && type !== "other"),
    stage,
    nextStep,
    nextStepDate: nextStep ? findDate(text, today) : "",
    dealValue,
    media: media.filter((m) => MEDIA_FORMATS.includes(m)),
  };
}
