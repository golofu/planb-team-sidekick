import { connection } from "next/server";
import { aiConfigured } from "@/lib/ai";

export async function GET() {
  // อ่าน env ตอนมีคำขอจริง ไม่ใช่ตอน build
  await connection();
  return Response.json({ ai: aiConfigured() });
}
