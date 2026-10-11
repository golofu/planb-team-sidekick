import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** โมเดลถูกสำหรับงานง่าย (จัดโครงสร้าง Activity) */
export const FAST_MODEL = "claude-haiku-5-5";
/** โมเดลแรงสำหรับงานคิด (AI Coach, กลยุทธ์) */
export const SMART_MODEL = "claude-opus-5-5";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export function describeAiError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "API key ไม่ถูกต้อง";
  if (error instanceof Anthropic.RateLimitError) return "เรียก AI ถี่เกินไป ลองใหม่อีกครู่";
  if (error instanceof Anthropic.BadRequestError) return `คำขอไม่ถูกต้อง: ${error.message}`;
  if (error instanceof Anthropic.APIError) return `AI ขัดข้อง (${error.status})`;
  if (error instanceof Error) return error.message;
  return "AI ขัดข้อง";
}
