import "server-only";
import * as z from "zod/v4";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { aiConfigured, describeAiError, getClient, SMART_MODEL } from "./ai";
import { fetchAllFeeds, type NewsItem } from "./feeds";
import { classifyByRules } from "./lead-rules";
import { BASE_CATEGORIES, DEFAULT_SOURCES } from "./lead-sources";
import { MEDIA_FORMATS } from "./mock-data";
import { LEAD_SIGNALS, type LeadCandidate, type LeadSource, type ScanStats } from "./types";

const AI_SIGNALS = LEAD_SIGNALS.filter((s) => s !== "lapsed");

const LeadsSchema = z.object({
  leads: z.array(
    z.object({
      newsIndex: z.number(),
      brandName: z.string(),
      matchedBrandId: z.string(),
      category: z.string(),
      signal: z.enum(AI_SIGNALS),
      score: z.number(),
      reason: z.string(),
      contactAngle: z.string(),
      suggestedMedia: z.array(z.string()),
    }),
  ),
});

const SYSTEM = `คุณคือนักวิเคราะห์ New Business ของ Plan B Media ผู้ให้บริการสื่อโฆษณานอกบ้าน (OOH) ในไทย
สื่อที่ขาย: จอดิจิทัลในสถานี BTS/MRT, จอในห้าง, บิลบอร์ดทางด่วน, จอสนามบิน, รถเมล์, จอในอาคารสำนักงาน

งาน: อ่านรายการข่าวแล้วคัดเฉพาะข่าวที่บ่งชี้ว่า "แบรนด์" มีโอกาสซื้อสื่อนอกบ้านเร็วๆ นี้ (buying signal)
- launch = เปิดตัวสินค้า/แบรนด์ใหม่ หรือแบรนด์ต่างชาติเข้าไทย
- expansion = ขยายสาขา เปิดหน้าร้าน
- competitor_media = กำลังลงสื่อนอกบ้านของคู่แข่ง หรือมีแคมเปญ OOH อยู่
- funding = ได้เงินทุน เพิ่มทุน IPO
- seasonal = แคมเปญตามเทศกาล อีเวนต์ คอนเสิร์ต แบรนด์แอมบาสเดอร์ใหม่

กติกา
- ข้ามข่าวที่ไม่มีแบรนด์ชัดเจน ข่าวการเมือง ข่าวเศรษฐกิจมหภาค ข่าวหน่วยงานรัฐ และข่าวของบริษัทสื่อเอง (Plan B, VGI, Master Ad เป็นคู่แข่ง ไม่ใช่ลูกค้า)
- แบรนด์เดียวกันให้รวมเป็น Lead เดียว เลือกข่าวที่แรงที่สุด (newsIndex)
- matchedBrandId: id จากรายชื่อแบรนด์ในระบบถ้าตรง ไม่ตรงให้เป็น ""
- category: เลือกจากรายการหมวดที่ให้เท่านั้น
- score 0-100: ความน่าจะซื้อสื่อ OOH ใน 1-3 เดือน (ขนาดแบรนด์ ความสดของข่าว ความชัดของสัญญาณ ความเหมาะกับสื่อ Plan B)
- reason: ภาษาไทย 1-2 ประโยค ทำไมควรติดต่อตอนนี้
- contactAngle: ภาษาไทย 1 ประโยค มุมที่ควรใช้เปิดการคุย
- suggestedMedia: เลือก 1-3 รายการจากรายการสื่อที่ให้
- คืนไม่เกิน 25 Lead เรียงจากคะแนนสูงไปต่ำ ถ้าไม่มีข่าวที่เข้าข่ายให้คืน leads เป็น []`;

export interface ScanInput {
  sources?: LeadSource[];
  knownBrands?: { id: string; name: string }[];
  categories?: string[];
}

export interface ScanResult {
  candidates: LeadCandidate[];
  stats: ScanStats;
}

export async function scanLeads(input: ScanInput): Promise<ScanResult> {
  const sources = input.sources?.length ? input.sources : DEFAULT_SOURCES;
  const knownBrands = (input.knownBrands ?? []).slice(0, 300);
  const categories = [...new Set([...(input.categories ?? []), ...BASE_CATEGORIES])].slice(0, 40);

  const feed = await fetchAllFeeds(sources);
  const news = feed.items.slice(0, 150);
  const base = { at: new Date().toISOString(), items: feed.items.length, sources: feed.sources };

  if (!aiConfigured()) {
    const candidates = classifyByRules(news, knownBrands, categories);
    return { candidates, stats: { ...base, mode: "rules", leads: candidates.length } };
  }

  try {
    const candidates = await classifyWithAI(news, knownBrands, categories);
    return { candidates, stats: { ...base, mode: "ai", leads: candidates.length } };
  } catch (error) {
    const candidates = classifyByRules(news, knownBrands, categories);
    return {
      candidates,
      stats: {
        ...base,
        mode: "rules",
        leads: candidates.length,
        warning: `${describeAiError(error)} — ใช้ตัวคัดแบบกฎแทน`,
      },
    };
  }
}

async function classifyWithAI(
  news: NewsItem[],
  knownBrands: { id: string; name: string }[],
  categories: string[],
): Promise<LeadCandidate[]> {
  if (news.length === 0) return [];
  const list = news
    .map((n, i) => `[${i}] (${n.source}, ${n.publishedAt.slice(0, 10)}) ${n.title}${n.snippet ? ` — ${n.snippet}` : ""}`)
    .join("\n");

  const response = await getClient().beta.messages.parse({
    model: SMART_MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: betaZodOutputFormat(LeadsSchema) },
    // ถ้าโมเดลหลักปฏิเสธคำขอ ให้ API ส่งต่อไปยังโมเดลสำรองที่ Anthropic แนะนำโดยอัตโนมัติ
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `หมวดที่ใช้ได้: ${JSON.stringify(categories)}
รายการสื่อ: ${JSON.stringify(MEDIA_FORMATS)}
แบรนด์ในระบบ: ${JSON.stringify(knownBrands)}

ข่าว:
${list}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("AI ปฏิเสธคำขอ");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("AI คืนผลลัพธ์ไม่ครบ");

  return parsed.leads
    .filter((l) => news[l.newsIndex] && l.brandName.trim())
    .map((l) => {
      const n = news[l.newsIndex];
      return {
        brandName: l.brandName.trim().slice(0, 80),
        matchedBrandId: knownBrands.some((b) => b.id === l.matchedBrandId) ? l.matchedBrandId : "",
        category: categories.includes(l.category) ? l.category : "อื่นๆ",
        signal: l.signal,
        score: Math.max(0, Math.min(100, Math.round(l.score))),
        reason: l.reason,
        contactAngle: l.contactAngle,
        suggestedMedia: l.suggestedMedia.filter((m) => MEDIA_FORMATS.includes(m)),
        headline: n.title,
        url: n.url,
        source: n.source,
        publishedAt: n.publishedAt,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);
}
