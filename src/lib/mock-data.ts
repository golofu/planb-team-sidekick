// ข้อมูลจำลองสำหรับต้นแบบ — ชื่อคน แบรนด์ และ Agency ทั้งหมดเป็นชื่อสมมติ
// วันที่ทั้งหมดคำนวณจาก "วันนี้" เพื่อให้ Dashboard ดูมีชีวิตทุกครั้งที่ reset
import type {
  Activity,
  ActivityType,
  AppData,
  Brand,
  Deal,
  Lead,
  LeadSettings,
  Stage,
  User,
} from "./types";
import { DEFAULT_SOURCES } from "./lead-sources";
import { addDays, toISODate } from "./dates";

export const DATA_VERSION = 2;

export const MEDIA_FORMATS = [
  "BTS Station Digital",
  "MRT Digital Screen",
  "Mall Digital Screen",
  "Billboard ทางด่วน",
  "Airport Digital",
  "Bus Wrap",
  "Office Building Screen",
];

export const USERS: User[] = [
  {
    id: "u-head",
    name: "Pim Wongsakul",
    nickname: "พิม",
    email: "pim.w@planbmedia.co.th",
    role: "head",
    color: "#0b2a5b",
    categories: ["ทุกหมวด"],
    monthlyTarget: 0,
  },
  {
    id: "u-ploy",
    name: "Ploy Charoenchai",
    nickname: "พลอย",
    email: "ploy.c@planbmedia.co.th",
    role: "sales",
    color: "#1fa8e0",
    categories: ["FMCG", "เครื่องดื่ม"],
    monthlyTarget: 6_000_000,
  },
  {
    id: "u-beam",
    name: "Beam Sirisuk",
    nickname: "บีม",
    email: "beam.s@planbmedia.co.th",
    role: "sales",
    color: "#7c3aed",
    categories: ["Telco", "Tech"],
    monthlyTarget: 5_000_000,
  },
  {
    id: "u-tong",
    name: "Tong Rattanakorn",
    nickname: "ต้อง",
    email: "tong.r@planbmedia.co.th",
    role: "sales",
    color: "#0d9488",
    categories: ["ยานยนต์", "พลังงาน"],
    monthlyTarget: 5_000_000,
  },
  {
    id: "u-mint",
    name: "Mint Phongphan",
    nickname: "มิ้นท์",
    email: "mint.p@planbmedia.co.th",
    role: "sales",
    color: "#db2777",
    categories: ["Beauty", "Fashion"],
    monthlyTarget: 4_500_000,
  },
  {
    id: "u-arm",
    name: "Arm Kittisak",
    nickname: "อาร์ม",
    email: "arm.k@planbmedia.co.th",
    role: "sales",
    color: "#ea580c",
    categories: ["ธนาคาร", "อสังหาฯ"],
    monthlyTarget: 5_500_000,
  },
];

const BRANDS: Brand[] = [
  { id: "b-siamfresh", name: "Siam Fresh Drinks", category: "เครื่องดื่ม", agency: "Orbit Media", ownerId: "u-ploy", contactName: "คุณวิภา", contactTitle: "Brand Manager" },
  { id: "b-crunchy", name: "Crunchy Snack Co.", category: "FMCG", ownerId: "u-ploy", contactName: "คุณเอก", contactTitle: "Marketing Director" },
  { id: "b-sweettoast", name: "Sweet Toast Café", category: "FMCG", ownerId: "u-ploy", contactName: "คุณแนน", contactTitle: "Head of Marketing" },
  { id: "b-novaphone", name: "NovaPhone", category: "Telco", agency: "MediaPlus Agency", ownerId: "u-beam", contactName: "Mr. Kevin Lee", contactTitle: "Marketing Lead SEA" },
  { id: "b-skynet", name: "SkyNet Fiber", category: "Telco", ownerId: "u-beam", contactName: "คุณปอ", contactTitle: "Brand Manager" },
  { id: "b-pixel", name: "PixelPay Wallet", category: "Tech", agency: "Blue Ocean Comm", ownerId: "u-beam", contactName: "คุณกานต์", contactTitle: "Growth Director" },
  { id: "b-krungev", name: "Krungthep EV", category: "ยานยนต์", agency: "Orbit Media", ownerId: "u-tong", contactName: "คุณธนา", contactTitle: "CMO" },
  { id: "b-volt", name: "Volt Energy", category: "พลังงาน", ownerId: "u-tong", contactName: "คุณโอ๊ต", contactTitle: "Marketing Manager" },
  { id: "b-roadmax", name: "RoadMax Tyres", category: "ยานยนต์", ownerId: "u-tong", contactName: "คุณบอย", contactTitle: "Brand Manager" },
  { id: "b-bloom", name: "Bloom Skincare", category: "Beauty", agency: "MediaPlus Agency", ownerId: "u-mint", contactName: "คุณจูน", contactTitle: "Brand Director" },
  { id: "b-lumi", name: "Lumi Cosmetics", category: "Beauty", ownerId: "u-mint", contactName: "คุณฟ้า", contactTitle: "Marketing Manager" },
  { id: "b-urbanfit", name: "UrbanFit Wear", category: "Fashion", ownerId: "u-mint", contactName: "คุณเจ", contactTitle: "Brand Manager" },
  { id: "b-zest", name: "Zest Bank", category: "ธนาคาร", agency: "Blue Ocean Comm", ownerId: "u-arm", contactName: "คุณสมชาย", contactTitle: "VP Marketing" },
  { id: "b-hana", name: "Hana Condo", category: "อสังหาฯ", ownerId: "u-arm", contactName: "คุณหนึ่ง", contactTitle: "Marketing Director" },
  { id: "b-goldcard", name: "GoldCard Credit", category: "ธนาคาร", ownerId: "u-arm", contactName: "คุณเปิ้ล", contactTitle: "Head of Brand" },
  { id: "b-luxeair", name: "LuxeAir Airline", category: "ท่องเที่ยว", agency: "Orbit Media", contactName: "Ms. Sarah Tan", contactTitle: "Regional Marketing" },
  { id: "b-mookata", name: "Mookata King", category: "ร้านอาหาร", contactName: "คุณต่อ", contactTitle: "เจ้าของแบรนด์" },
  { id: "b-thaisafe", name: "ThaiSafe Insurance", category: "ประกัน", ownerId: "u-arm", contactName: "คุณกฤษ", contactTitle: "Marketing Manager" },
  // แบรนด์จาก Lead ตัวอย่าง
  { id: "b-kumo", name: "Kumo Ramen", category: "ร้านอาหาร", ownerId: "u-mint", contactName: "", contactTitle: "" },
  { id: "b-greenleaf", name: "GreenLeaf Tea", category: "เครื่องดื่ม", ownerId: "u-ploy", contactName: "", contactTitle: "" },
  { id: "b-orbitpay", name: "OrbitPay", category: "Tech", ownerId: "u-beam", contactName: "", contactTitle: "" },
  { id: "b-solaris", name: "Solaris Home", category: "อสังหาฯ", contactName: "", contactTitle: "" },
  { id: "b-velvet", name: "Velvet Beauty", category: "Beauty", contactName: "", contactTitle: "" },
];

// Seeded random เพื่อให้ข้อมูลจำลองเหมือนเดิมทุกครั้งที่ reset
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

interface DealSeed {
  brandId: string;
  title: string;
  value: number;
  stage: Stage;
  createdDaysAgo: number;
  stageDaysAgo: number;
  media: string[];
  nextStep?: string;
  nextStepInDays?: number;
}

const DEAL_SEEDS: DealSeed[] = [
  { brandId: "b-siamfresh", title: "แคมเปญเครื่องดื่มรสใหม่ Q4", value: 4_200_000, stage: "negotiation", createdDaysAgo: 30, stageDaysAgo: 3, media: ["BTS Station Digital", "Mall Digital Screen"], nextStep: "ส่งใบเสนอราคาฉบับแก้ไข", nextStepInDays: 1 },
  { brandId: "b-crunchy", title: "Back to School", value: 1_800_000, stage: "proposal", createdDaysAgo: 18, stageDaysAgo: 5, media: ["Mall Digital Screen"], nextStep: "โทร follow-up proposal", nextStepInDays: 2 },
  { brandId: "b-sweettoast", title: "เปิดสาขาใหม่ 20 สาขา", value: 2_500_000, stage: "won", createdDaysAgo: 40, stageDaysAgo: 6, media: ["Office Building Screen", "BTS Station Digital"] },
  { brandId: "b-novaphone", title: "เปิดตัวมือถือรุ่นใหม่", value: 8_500_000, stage: "proposal", createdDaysAgo: 25, stageDaysAgo: 13, media: ["BTS Station Digital", "Billboard ทางด่วน", "Airport Digital"], nextStep: "นัด present กับ Agency", nextStepInDays: -2 },
  { brandId: "b-skynet", title: "โปรเน็ตบ้านปลายปี", value: 1_200_000, stage: "contacted", createdDaysAgo: 12, stageDaysAgo: 12, media: ["Bus Wrap"] },
  { brandId: "b-pixel", title: "Cashback Campaign", value: 2_000_000, stage: "meeting", createdDaysAgo: 9, stageDaysAgo: 4, media: ["MRT Digital Screen"], nextStep: "ส่ง media plan", nextStepInDays: 3 },
  { brandId: "b-krungev", title: "EV Launch Bangkok", value: 6_000_000, stage: "meeting", createdDaysAgo: 14, stageDaysAgo: 2, media: ["Billboard ทางด่วน", "Mall Digital Screen"], nextStep: "brief ทีม creative ทำ mockup", nextStepInDays: 2 },
  { brandId: "b-volt", title: "Brand Awareness 2027", value: 3_000_000, stage: "lead", createdDaysAgo: 4, stageDaysAgo: 4, media: ["Billboard ทางด่วน"] },
  { brandId: "b-roadmax", title: "หน้าฝนขับขี่ปลอดภัย", value: 900_000, stage: "won", createdDaysAgo: 35, stageDaysAgo: 15, media: ["Billboard ทางด่วน"] },
  { brandId: "b-bloom", title: "Bloom Summer Glow", value: 3_500_000, stage: "negotiation", createdDaysAgo: 28, stageDaysAgo: 16, media: ["BTS Station Digital", "Mall Digital Screen"], nextStep: "ขออนุมัติส่วนลดจาก Head", nextStepInDays: 0 },
  { brandId: "b-lumi", title: "Lumi x Influencer", value: 1_500_000, stage: "proposal", createdDaysAgo: 10, stageDaysAgo: 2, media: ["Mall Digital Screen"], nextStep: "โทรถาม feedback", nextStepInDays: 4 },
  { brandId: "b-urbanfit", title: "Grand Opening Siam", value: 1_100_000, stage: "lost", createdDaysAgo: 30, stageDaysAgo: 8, media: ["BTS Station Digital"] },
  { brandId: "b-zest", title: "Digital Banking App", value: 7_000_000, stage: "contacted", createdDaysAgo: 20, stageDaysAgo: 18, media: ["BTS Station Digital", "Office Building Screen"] },
  { brandId: "b-hana", title: "Hana Condo เปิดโครงการใหม่", value: 2_800_000, stage: "proposal", createdDaysAgo: 22, stageDaysAgo: 11, media: ["Billboard ทางด่วน"], nextStep: "ส่ง proposal รอบ 2", nextStepInDays: -1 },
  { brandId: "b-goldcard", title: "บัตรเครดิตท่องเที่ยว", value: 2_200_000, stage: "won", createdDaysAgo: 33, stageDaysAgo: 3, media: ["Airport Digital"] },
  // ลูกค้าเก่าที่หายไป (ปิดได้ 140 วันก่อน ไม่มีดีลใหม่) → เกิด Lead "ลูกค้าเก่า" ตอนสแกน
  { brandId: "b-thaisafe", title: "ประกันเดินทางสงกรานต์", value: 3_200_000, stage: "won", createdDaysAgo: 170, stageDaysAgo: 140, media: ["BTS Station Digital", "Airport Digital"] },
];

const NO_ACTIVITY_BRANDS = new Set(["b-thaisafe", "b-kumo", "b-greenleaf", "b-orbitpay", "b-solaris", "b-velvet"]);

export const DEFAULT_LEAD_SETTINGS: LeadSettings = {
  cap: 12,
  rrIndex: 0,
  sources: DEFAULT_SOURCES,
};

interface LeadSeed {
  brandId: string;
  ownerId?: string;
  status: Lead["status"];
  daysAgo: number;
  signal: Lead["signal"];
  score: number;
  category: string;
  headline: string;
  reason: string;
  angle: string;
  media: string[];
  requestedBy?: string;
}

// Lead ตัวอย่างหลายอายุ เพื่อให้เห็นการเตือน 7/15 วันและกองกลาง
const LEAD_SEEDS: LeadSeed[] = [
  { brandId: "b-kumo", ownerId: "u-mint", status: "assigned", daysAgo: 6, signal: "expansion", score: 84, category: "ร้านอาหาร", headline: "Kumo Ramen เตรียมเปิด 12 สาขาใหม่ในห้างใจกลางเมือง", reason: "ขยายสาขาในห้างจำนวนมาก ต้องการดึงคนเข้าร้านช่วงเปิดสาขา", angle: "เสนอจอในห้างที่มีสาขาเปิดใหม่ พร้อมแพ็กเกจเปิดร้าน", media: ["Mall Digital Screen"] },
  { brandId: "b-greenleaf", ownerId: "u-ploy", status: "working", daysAgo: 9, signal: "launch", score: 88, category: "เครื่องดื่ม", headline: "GreenLeaf Tea เปิดตัวชาเขียวสูตรไม่มีน้ำตาล บุกตลาดคนรุ่นใหม่", reason: "สินค้าใหม่กลุ่มคนเมือง เหมาะกับสื่อ BTS ที่เข้าถึงคนทำงาน", angle: "เสนอแพ็กเกจเปิดตัว 4 สัปดาห์บน BTS สายสุขุมวิท", media: ["BTS Station Digital"] },
  { brandId: "b-orbitpay", ownerId: "u-beam", status: "assigned", daysAgo: 13, signal: "funding", score: 79, category: "Tech", headline: "OrbitPay ปิดระดมทุน Series B เตรียมขยายฐานผู้ใช้ในไทย", reason: "ได้งบการตลาดก้อนใหม่หลังระดมทุน กำลังหาช่องทางสร้างการรับรู้", angle: "เสนอแผนสร้างแบรนด์ 3 เดือนบน BTS และจออาคารสำนักงาน", media: ["BTS Station Digital", "Office Building Screen"] },
  { brandId: "b-solaris", status: "pool", daysAgo: 16, signal: "launch", score: 72, category: "อสังหาฯ", headline: "Solaris Home เปิดโครงการบ้านเดี่ยวโซนบางนา", reason: "โครงการใหม่ต้องการสื่อตามเส้นทางเข้าโครงการ", angle: "เสนอบิลบอร์ดทางด่วนบางนา-ตราด", media: ["Billboard ทางด่วน"] },
  { brandId: "b-velvet", status: "requested", requestedBy: "u-mint", daysAgo: 2, signal: "competitor_media", score: 81, category: "Beauty", headline: "Velvet Beauty ขึ้นป้ายโฆษณาใหญ่กลางสยามรับแคมเปญใหม่", reason: "มีงบสื่อนอกบ้านอยู่แล้ว สามารถเสนอจุดที่ครอบคลุมกว่า", angle: "เสนอแพ็กเกจ BTS สยาม + จอในห้างย่านเดียวกัน", media: ["BTS Station Digital", "Mall Digital Screen"] },
];

// โปรไฟล์ความขยันของแต่ละคน (activity เฉลี่ยต่อวันทำงาน) เพื่อให้ Dashboard มีทั้งเขียว เหลือง แดง
const ACTIVITY_PROFILE: Record<string, { perDay: number; meetingRate: number; proposalRate: number }> = {
  "u-ploy": { perDay: 5.5, meetingRate: 0.22, proposalRate: 0.1 },
  "u-beam": { perDay: 3.5, meetingRate: 0.15, proposalRate: 0.06 },
  "u-tong": { perDay: 4.8, meetingRate: 0.24, proposalRate: 0.08 },
  "u-mint": { perDay: 4.4, meetingRate: 0.2, proposalRate: 0.1 },
  "u-arm": { perDay: 2, meetingRate: 0.12, proposalRate: 0.05 },
};

const SUMMARIES: Record<ActivityType, string[]> = {
  call: ["โทรแนะนำสื่อ Plan B และขอนัดพบ", "โทร follow-up หลังส่งข้อมูลสื่อ", "โทรคุยงบไตรมาสหน้า"],
  line: ["ส่ง media kit ทาง LINE", "แจ้งโปรโมชั่นพื้นที่ว่างเดือนหน้า", "ส่งรูป case study ให้ดู"],
  email: ["ส่งอีเมลแนะนำตัวและ rate card", "ส่งสรุปการประชุม", "ส่ง occupancy ล่าสุด"],
  meeting: ["เข้าพบรับ brief แคมเปญ", "present media plan", "ประชุมกับทีม Agency"],
  proposal: ["ส่ง proposal พร้อม mockup", "ส่ง proposal ฉบับแก้ไข"],
  other: ["ร่วมงานเปิดตัวสินค้าของลูกค้า"],
};

export function buildSeedData(today = new Date()): AppData {
  const rand = rng(20261011);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const deals: Deal[] = DEAL_SEEDS.map((d, i) => {
    const brand = BRANDS.find((b) => b.id === d.brandId)!;
    return {
      id: `d-${i + 1}`,
      brandId: d.brandId,
      ownerId: brand.ownerId ?? "u-head",
      title: d.title,
      value: d.value,
      stage: d.stage,
      media: d.media,
      createdAt: toISODate(addDays(today, -d.createdDaysAgo)),
      stageChangedAt: toISODate(addDays(today, -d.stageDaysAgo)),
      closedAt:
        d.stage === "won" || d.stage === "lost"
          ? toISODate(addDays(today, -d.stageDaysAgo))
          : undefined,
      nextStep: d.nextStep,
      nextStepDate:
        d.nextStepInDays !== undefined
          ? toISODate(addDays(today, d.nextStepInDays))
          : undefined,
    };
  });

  const activities: Activity[] = [];
  let n = 0;
  for (const user of USERS.filter((u) => u.role === "sales")) {
    const profile = ACTIVITY_PROFILE[user.id];
    // ไม่สุ่ม Activity ให้แบรนด์จาก Lead ตัวอย่าง/ลูกค้าเก่า (ไม่งั้นการเตือน 7/15 วันจะหายไป)
    const myBrands = BRANDS.filter((b) => b.ownerId === user.id && !NO_ACTIVITY_BRANDS.has(b.id));
    for (let back = 20; back >= 0; back--) {
      const day = addDays(today, -back);
      const dow = day.getDay();
      if (dow === 0 || dow === 6) continue;
      const count = Math.round(profile.perDay * (0.6 + rand() * 0.8));
      for (let k = 0; k < count; k++) {
        const r = rand();
        const type: ActivityType =
          r < profile.proposalRate
            ? "proposal"
            : r < profile.proposalRate + profile.meetingRate
              ? "meeting"
              : pick(["call", "call", "line", "email"] as ActivityType[]);
        const brand = pick(myBrands);
        const isNewContact =
          (type === "call" || type === "line" || type === "email") && rand() < 0.85;
        const summary = pick(SUMMARIES[type]);
        const deal = deals.find((d) => d.brandId === brand.id);
        activities.push({
          id: `a-${++n}`,
          userId: user.id,
          brandId: isNewContact ? undefined : brand.id,
          dealId: isNewContact ? undefined : deal?.id,
          type,
          summary: isNewContact ? `${summary} (ลูกค้าใหม่)` : summary,
          rawText: summary,
          date: toISODate(day),
          isNewContact,
        });
      }
    }
  }

  const leads: Lead[] = LEAD_SEEDS.map((l, i) => {
    const created = toISODate(addDays(today, -l.daysAgo));
    const brand = BRANDS.find((b) => b.id === l.brandId)!;
    return {
      id: `l-seed-${i + 1}`,
      brandName: brand.name,
      matchedBrandId: brand.id,
      brandId: brand.id,
      category: l.category,
      signal: l.signal,
      score: l.score,
      reason: l.reason,
      contactAngle: l.angle,
      suggestedMedia: l.media,
      headline: l.headline,
      url: "",
      source: "ตัวอย่าง (ข้อมูลสมมติ)",
      publishedAt: addDays(today, -l.daysAgo).toISOString(),
      ownerId: l.ownerId,
      status: l.status,
      createdAt: created,
      assignedAt: l.ownerId ? created : undefined,
      requestedBy: l.requestedBy,
      history: [{ at: created, text: l.ownerId ? "ตัวอย่าง: มอบหมายแล้ว" : "ตัวอย่าง: อยู่ในกองกลาง" }],
    };
  });

  return {
    version: DATA_VERSION,
    users: USERS,
    brands: BRANDS,
    deals,
    activities: activities.reverse(),
    notes: [],
    leads,
    settings: {
      kpi: { newContacts: 15, meetings: 4, proposals: 2 },
      staleDays: { proposal: 10, other: 14 },
      leads: DEFAULT_LEAD_SETTINGS,
    },
  };
}
