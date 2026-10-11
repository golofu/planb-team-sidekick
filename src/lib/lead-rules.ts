// ตัวคัด Lead แบบกฎ (ใช้เมื่อไม่มี ANTHROPIC_API_KEY) — แม่นน้อยกว่า AI แต่ใช้งานได้
import type { LeadCandidate, LeadSignal } from "./types";
import { SIGNAL_MEDIA } from "./lead-sources";

interface NewsLike {
  source: string;
  title: string;
  url: string;
  publishedAt: string;
  snippet: string;
}

const SIGNAL_RULES: [LeadSignal, RegExp, number][] = [
  ["competitor_media", /บิลบอร์ด|ป้ายโฆษณา|สื่อนอกบ้าน|\bOOH\b|\bDOOH\b|VGI|Master Ad/i, 80],
  ["expansion", /ขยายสาขา|เปิดสาขา|สาขาใหม่|สาขาที่ \d+|แฟลกชิป|flagship|ขยายธุรกิจ|opens? (?:new )?store/i, 75],
  ["funding", /ระดมทุน|\bIPO\b|ไอพีโอ|เพิ่มทุน|Series [A-D]|funding|raises \$|เข้าตลาดหลักทรัพย์/i, 70],
  ["launch", /เปิดตัว|ลอนช์|launch|เปิดขาย|สินค้าใหม่|รุ่นใหม่|คอลเลกชัน|รสชาติใหม่|introduces|unveils/i, 70],
  ["seasonal", /สงกรานต์|ปีใหม่|คริสต์มาส|ลอยกระทง|คอนเสิร์ต|เทศกาล|แคมเปญ|แบรนด์แอมบาสเดอร์|พรีเซนเตอร์/i, 60],
];

const CATEGORY_RULES: [string, RegExp][] = [
  ["เครื่องดื่ม", /เครื่องดื่ม|กาแฟ|ชา|น้ำดื่ม|เบียร์|drink|coffee|tea/i],
  ["FMCG", /ขนม|อาหาร|snack|ผงซักฟอก|FMCG/i],
  ["Telco", /มือถือ|5G|เครือข่าย|ซิม|AIS|True|dtac|smartphone/i],
  ["Tech", /แอป|app|AI|เทค|แพลตฟอร์ม|wallet|fintech|ซอฟต์แวร์/i],
  ["ยานยนต์", /รถยนต์|EV|รถไฟฟ้า|มอเตอร์ไซค์|ยานยนต์|automotive/i],
  ["พลังงาน", /พลังงาน|น้ำมัน|โซลาร์|energy/i],
  ["Beauty", /ความงาม|สกินแคร์|เครื่องสำอาง|กันแดด|ลิปสติก|เซรั่ม|skincare|beauty|cosmetic/i],
  ["Fashion", /แฟชั่น|เสื้อผ้า|รองเท้า|fashion|apparel/i],
  ["ธนาคาร", /ธนาคาร|บัตรเครดิต|สินเชื่อ|bank/i],
  ["อสังหาฯ", /คอนโด|บ้าน|อสังหา|โครงการ|condo|property/i],
  ["ประกัน", /ประกัน|insurance/i],
  ["ท่องเที่ยว", /สายการบิน|โรงแรม|ท่องเที่ยว|airline|hotel|travel/i],
  ["ร้านอาหาร", /ร้านอาหาร|คาเฟ่|ไก่ทอด|ฟาสต์ฟู้ด|KFC|McDonald|restaurant|café|cafe/i],
  ["ค้าปลีก", /ห้าง|ค้าปลีก|retail|ร้านสะดวกซื้อ/i],
  // ระวังคำสั้นที่ซ้อนในคำอื่น เช่น "ยา" อยู่ใน "รายได้"
  ["สุขภาพ", /โรงพยาบาล|สุขภาพ|ยารักษา|เวชภัณฑ์|health|clinic/i],
  ["บันเทิง", /ภาพยนตร์|ซีรีส์|คอนเสิร์ต|เกม|movie|game/i],
];

const REASON: Record<LeadSignal, string> = {
  launch: "มีสินค้า/แบรนด์ใหม่ ต้องการสร้างการรับรู้ช่วงเปิดตัว",
  expansion: "ขยายสาขา ต้องการสื่อใกล้จุดขายเพื่อดึงคนเข้าร้าน",
  competitor_media: "ใช้สื่อนอกบ้านอยู่แล้ว มีงบสื่อประเภทนี้",
  funding: "ได้งบก้อนใหม่ มักเพิ่มงบการตลาดตามมา",
  seasonal: "มีแคมเปญตามช่วงเวลา ต้องจองสื่อล่วงหน้า",
  lapsed: "เคยเป็นลูกค้า ปิดการขายง่ายกว่าลูกค้าใหม่",
};

const ANGLE: Record<LeadSignal, string> = {
  launch: "เสนอแพ็กเกจเปิดตัวสร้างการรับรู้วงกว้างในช่วง 2-4 สัปดาห์แรก",
  expansion: "เสนอสื่อใกล้สาขาใหม่เพื่อดึงคนเข้าร้าน",
  competitor_media: "เสนอทางเลือกที่ครอบคลุมกว่าหรือคุ้มค่ากว่าสื่อที่ใช้อยู่",
  funding: "ช่วงมีงบการตลาดใหม่ เสนอแผนสร้างแบรนด์ระยะยาว",
  seasonal: "เสนอแพ็กเกจตามช่วงเทศกาล จองพื้นที่ล่วงหน้า",
  lapsed: "ชวนกลับมาด้วยผลงานแคมเปญเดิมและข้อเสนอพิเศษ",
};

const BRAND_RE = /[A-Z][A-Za-z0-9&'’.+-]*(?:\s+[A-Z0-9][A-Za-z0-9&'’.+-]*)?/;
// "X เป็นแบรนด์แอมบาสเดอร์ของ Cartier" → แบรนด์คือ Cartier ไม่ใช่ X
const AMBASSADOR_RE = /แอมบาสเดอร์(?:คนใหม่|ล่าสุด)?(?:ของ|ให้กับ|ให้)\s*([A-Za-z][A-Za-z0-9&'’.+-]*(?:\s+[A-Z][A-Za-z0-9&'’.+-]*)?)/;
// ไม่ใช่ลูกค้า: หน่วยงานรัฐ/การเงินระหว่างประเทศ/สำนักข่าว
const NOT_CLIENT = /IMF|World Bank|ธนาคารแห่งประเทศไทย|แบงก์ชาติ|กระทรวง|รัฐบาล|Xinhua|สำนักข่าว|กรมการ|ครม\./i;
// ข่าวตลาดต่างประเทศ ลดคะแนน
const FOREIGN = /ในจีน|ที่จีน|ตลาดจีน|in China|Sri Lanka|ศรีลังกา|อินเดีย|India|เวียดนาม|Vietnam|Indonesia/i;
const THAI_MARKET = /[฀-๿]|Thailand|Thai|Bangkok/;
const NOT_BRAND = /^(AI|EV|IPO|OOH|DOOH|CEO|CMO|SET|Q[1-4]|THE|NEW|PR)$/i;

export function classifyByRules(
  items: NewsLike[],
  knownBrands: { id: string; name: string }[],
  categories: string[],
): LeadCandidate[] {
  const out: LeadCandidate[] = [];
  for (const item of items) {
    const hay = `${item.title} ${item.snippet}`;
    if (NOT_CLIENT.test(hay) || !THAI_MARKET.test(hay)) continue;
    const rule = SIGNAL_RULES.find(([, re]) => re.test(hay));
    if (!rule) continue;
    const [signal, , base] = rule;
    const known = knownBrands.find((b) => hay.toLowerCase().includes(b.name.toLowerCase()));
    const latin = (item.title.match(AMBASSADOR_RE)?.[1] ?? item.title.match(BRAND_RE)?.[0])?.trim();
    const brandName = known?.name ?? (latin && !NOT_BRAND.test(latin) ? latin : "");
    if (!brandName) continue;
    const category = CATEGORY_RULES.find(([c, re]) => categories.includes(c) && re.test(hay))?.[0] ?? "อื่นๆ";
    const fresh = item.publishedAt && Date.now() - new Date(item.publishedAt).getTime() < 24 * 3_600_000 ? 5 : 0;
    out.push({
      brandName,
      matchedBrandId: known?.id ?? "",
      category,
      signal,
      score: Math.max(30, Math.min(95, base + fresh + (known ? 5 : 0) - (FOREIGN.test(hay) ? 20 : 0))),
      reason: item.snippet && item.snippet !== item.title ? item.snippet : REASON[signal],
      contactAngle: ANGLE[signal],
      suggestedMedia: SIGNAL_MEDIA[signal],
      headline: item.title,
      url: item.url,
      source: item.source,
      publishedAt: item.publishedAt,
    });
  }
  // แบรนด์ละ 1 Lead (เก็บคะแนนสูงสุด)
  const best = new Map<string, LeadCandidate>();
  for (const c of out) {
    const k = c.brandName.toLowerCase();
    if (!best.has(k) || best.get(k)!.score < c.score) best.set(k, c);
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 25);
}
