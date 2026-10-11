import { scanLeads } from "@/lib/lead-scan";
import type { LeadSource } from "@/lib/types";

const isSource = (s: unknown): s is LeadSource =>
  typeof s === "object" &&
  s !== null &&
  typeof (s as LeadSource).name === "string" &&
  typeof (s as LeadSource).url === "string" &&
  /^https:\/\//.test((s as LeadSource).url);

export async function POST(request: Request) {
  let body: { sources?: unknown; knownBrands?: unknown; categories?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }
  const sources = (Array.isArray(body.sources) ? body.sources : []).filter(isSource).slice(0, 30);
  const knownBrands = (Array.isArray(body.knownBrands) ? body.knownBrands : [])
    .filter((b): b is { id: string; name: string } => typeof b?.id === "string" && typeof b?.name === "string")
    .map((b) => ({ id: b.id, name: b.name.slice(0, 100) }));
  const categories = (Array.isArray(body.categories) ? body.categories : [])
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.slice(0, 40));

  const result = await scanLeads({ sources, knownBrands, categories });
  return Response.json(result);
}
