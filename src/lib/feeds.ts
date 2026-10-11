import "server-only";
import { XMLParser } from "fast-xml-parser";
import type { LeadSource } from "./types";

export interface NewsItem {
  source: string;
  title: string;
  url: string;
  publishedAt: string;
  snippet: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 PlanBTeamSidekick/1.0";

const parser = new XMLParser({ ignoreAttributes: true, processEntities: true, htmlEntities: true });

function text(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object" && "#text" in v) return String((v as { "#text": unknown })["#text"]);
  return "";
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFeed(src: LeadSource): Promise<NewsItem[]> {
  const res = await fetch(src.url, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = parser.parse(await res.text());
  const raw = xml?.rss?.channel?.item ?? xml?.feed?.entry ?? [];
  const items = Array.isArray(raw) ? raw : [raw];
  return items
    .map((it: Record<string, unknown>) => {
      let title = stripHtml(text(it.title));
      // Google News: "หัวข่าว - ชื่อสำนักข่าว"
      const gSource = text(it.source);
      if (gSource && title.endsWith(` - ${gSource}`)) title = title.slice(0, -(gSource.length + 3));
      const date = new Date(text(it.pubDate) || text(it.published) || text(it.updated));
      return {
        source: gSource ? `${src.name} · ${gSource}` : src.name,
        title,
        url: text(it.link) || text(it.guid),
        publishedAt: Number.isNaN(date.getTime()) ? "" : date.toISOString(),
        snippet: stripHtml(text(it.description) || text(it.summary)).slice(0, 220),
      };
    })
    .filter((i) => i.title && i.url);
}

export interface FeedResult {
  items: NewsItem[];
  sources: { name: string; ok: boolean; count: number }[];
}

/** ดึงทุกแหล่งพร้อมกัน เก็บเฉพาะข่าวภายใน maxAgeHours และตัดหัวข่าวซ้ำ */
export async function fetchAllFeeds(sources: LeadSource[], maxAgeHours = 48): Promise<FeedResult> {
  const enabled = sources.filter((s) => s.enabled);
  const results = await Promise.allSettled(enabled.map(fetchFeed));
  const cutoff = Date.now() - maxAgeHours * 3_600_000;
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  const stats: FeedResult["sources"] = [];

  results.forEach((r, i) => {
    const name = enabled[i].name;
    if (r.status === "rejected") {
      stats.push({ name, ok: false, count: 0 });
      return;
    }
    let count = 0;
    for (const item of r.value) {
      if (item.publishedAt && new Date(item.publishedAt).getTime() < cutoff) continue;
      const key = item.title.replace(/\s+/g, "").toLowerCase().slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      count++;
    }
    stats.push({ name, ok: true, count });
  });

  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return { items, sources: stats };
}
