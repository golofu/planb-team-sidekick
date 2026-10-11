import { aiConfigured, describeAiError, getClient, SMART_MODEL } from "@/lib/ai";

/** ข้อมูลทีมที่หน้า Team Dashboard สรุปส่งมา (คำนวณ KPI ฝั่ง client แล้ว) */
export interface CoachInput {
  weekLabel: string;
  targets: { newContacts: number; meetings: number; proposals: number };
  members: {
    name: string;
    categories: string[];
    rag: string;
    newContacts: number;
    meetings: number;
    proposals: number;
    wonMonth: number;
    monthTarget: number;
    openPipeline: number;
    lastActivityDate?: string;
    recentActivities: string[];
    staleDeals: string[];
  }[];
}

const SYSTEM = `คุณคือ AI Sales Coach ของ Group Head Account Manager ที่ Plan B Media (สื่อโฆษณานอกบ้าน: BTS, MRT, ห้าง, ทางด่วน, สนามบิน)
ทีมมีเซลส์ 5 คน คุณได้รับ KPI ของสัปดาห์นี้ ยอดขายเทียบเป้า Pipeline และ Activity ล่าสุดของแต่ละคน

เขียนสรุปภาษาไทยให้ Group Head อ่านจบใน 2 นาที เป็น Markdown ตามหัวข้อนี้
## ภาพรวมทีมสัปดาห์นี้
2-3 บรรทัด ตัวเลขสำคัญและแนวโน้ม
## ใครต้องการความช่วยเหลือ
เรียงจากเร่งด่วนที่สุด ระบุชื่อ ปัญหาที่เห็นจากข้อมูล และสิ่งที่ Head ควรช่วย
## Deal ที่ต้องเข้าไปช่วยปิด
Deal ค้างหรือมูลค่าสูงที่ Head ควรลงไปช่วย พร้อมวิธีเข้าไปช่วย
## หัวข้อคุย 1:1
คนละ 1-2 คำถามที่ควรถาม (เชิงโค้ช ไม่ตำหนิ)
## ชมเชย
ใครทำได้ดีเรื่องอะไร

ใช้เฉพาะข้อมูลที่ได้รับ ห้ามแต่งตัวเลขเพิ่ม พูดตรง กระชับ เป็นมิตร`;

function rulesSummary(input: CoachInput): string {
  const byRisk = [...input.members].sort((a, b) =>
    a.rag === b.rag ? 0 : a.rag === "red" ? -1 : b.rag === "red" ? 1 : a.rag === "yellow" ? -1 : 1,
  );
  const lines = [
    "## ภาพรวมทีมสัปดาห์นี้",
    `- ติดต่อลูกค้าใหม่รวม ${input.members.reduce((s, m) => s + m.newContacts, 0)} ครั้ง · นัดพบ ${input.members.reduce((s, m) => s + m.meetings, 0)} ครั้ง · ส่ง Proposal ${input.members.reduce((s, m) => s + m.proposals, 0)} ฉบับ`,
    "## ใครต้องการความช่วยเหลือ",
    ...byRisk
      .filter((m) => m.rag !== "green")
      .map(
        (m) =>
          `- **${m.name}** (${m.rag === "red" ? "ต้องช่วย" : "ต้องเร่ง"}): ติดต่อใหม่ ${m.newContacts}/${input.targets.newContacts}, นัดพบ ${m.meetings}/${input.targets.meetings}, Proposal ${m.proposals}/${input.targets.proposals}`,
      ),
    "## Deal ที่ต้องเข้าไปช่วยปิด",
    ...input.members.flatMap((m) => m.staleDeals.map((d) => `- ${m.name}: ${d}`)),
    "## ชมเชย",
    ...input.members.filter((m) => m.rag === "green").map((m) => `- **${m.name}** ทำ Activity ได้ตามเป้า`),
    "",
    "_สรุปนี้สร้างจากกฎพื้นฐาน — ใส่ ANTHROPIC_API_KEY เพื่อให้ AI Coach วิเคราะห์เชิงลึก_",
  ];
  return lines.join("\n");
}

export async function POST(request: Request) {
  let input: CoachInput;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }
  if (!Array.isArray(input?.members) || !input.targets || input.members.length > 20) {
    return Response.json({ error: "ข้อมูลทีมไม่ถูกต้อง" }, { status: 400 });
  }
  if (JSON.stringify(input).length > 60_000) {
    return Response.json({ error: "ข้อมูลทีมใหญ่เกินไป" }, { status: 400 });
  }

  if (!aiConfigured()) {
    return Response.json({ source: "rules", text: rulesSummary(input) });
  }

  try {
    const response = await getClient().beta.messages.create({
      model: SMART_MODEL,
      max_tokens: 16000,
      output_config: { effort: "high" },
      // ถ้าโมเดลหลักปฏิเสธคำขอ ให้ API ส่งต่อไปยังโมเดลสำรองที่ Anthropic แนะนำโดยอัตโนมัติ
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: `ข้อมูลทีม (JSON):\n${JSON.stringify(input, null, 2)}` }],
    });

    if (response.stop_reason === "refusal") {
      return Response.json({
        source: "rules",
        warning: "AI ไม่สามารถสรุปได้ ใช้สรุปพื้นฐานแทน",
        text: rulesSummary(input),
      });
    }

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return Response.json({ source: "ai", text });
  } catch (error) {
    return Response.json({
      source: "rules",
      warning: `${describeAiError(error)} — ใช้สรุปพื้นฐานแทน`,
      text: rulesSummary(input),
    });
  }
}
