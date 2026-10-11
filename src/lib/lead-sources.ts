import type { LeadSignal, LeadSource } from "./types";

const gnews = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=th&gl=TH&ceid=TH:th`;

/** แหล่งข่าวตั้งต้น (ตรวจแล้วว่าดึง RSS ได้จริง ณ ต.ค. 2026) */
export const DEFAULT_SOURCES: LeadSource[] = [
  { id: "marketeer", name: "Marketeer", url: "https://marketeeronline.co/feed", enabled: true },
  { id: "brandbuffet", name: "Brand Buffet", url: "https://www.brandbuffet.in.th/feed/", enabled: true },
  { id: "marketingoops", name: "MarketingOops", url: "https://www.marketingoops.com/feed/", enabled: true },
  { id: "prachachat", name: "ประชาชาติธุรกิจ", url: "https://www.prachachat.net/feed", enabled: true },
  // Positioning และ Thansettakij ไม่มี RSS — อ่านผ่าน Google News แทน
  { id: "positioning", name: "Positioning", url: gnews("site:positioningmag.com when:2d"), enabled: true },
  { id: "thansettakij", name: "Thansettakij", url: gnews("site:thansettakij.com when:2d"), enabled: true },
  { id: "prnewswire", name: "PR Newswire APAC", url: "https://www.prnewswire.com/apac/rss/news-releases-list.rss", enabled: true },
  { id: "gn-launch", name: "Google News: เปิดตัว", url: gnews("เปิดตัว แบรนด์ when:2d"), enabled: true },
  { id: "gn-expand", name: "Google News: ขยายสาขา", url: gnews("ขยายสาขา OR เปิดสาขาใหม่ when:2d"), enabled: true },
  { id: "gn-campaign", name: "Google News: แคมเปญ/แอมบาสเดอร์", url: gnews("แคมเปญใหม่ OR แบรนด์แอมบาสเดอร์ when:2d"), enabled: true },
  { id: "gn-funding", name: "Google News: ระดมทุน/IPO (SET)", url: gnews("ระดมทุน OR IPO ตลาดหลักทรัพย์ when:3d"), enabled: true },
];

/** หมวดลูกค้าที่ใช้จัด Lead (รวมกับหมวดที่ทีมดูแลใน Settings) */
export const BASE_CATEGORIES = [
  "FMCG",
  "เครื่องดื่ม",
  "Telco",
  "Tech",
  "ยานยนต์",
  "พลังงาน",
  "Beauty",
  "Fashion",
  "ธนาคาร",
  "อสังหาฯ",
  "ประกัน",
  "ท่องเที่ยว",
  "ร้านอาหาร",
  "ค้าปลีก",
  "สุขภาพ",
  "บันเทิง",
  "อื่นๆ",
];

export const SIGNAL_MEDIA: Record<LeadSignal, string[]> = {
  launch: ["BTS Station Digital", "Mall Digital Screen"],
  expansion: ["Mall Digital Screen", "Billboard ทางด่วน"],
  competitor_media: ["BTS Station Digital", "Billboard ทางด่วน"],
  funding: ["Office Building Screen", "BTS Station Digital"],
  seasonal: ["Mall Digital Screen", "Airport Digital"],
  lapsed: ["BTS Station Digital"],
};
