# Plan B Team Sidekick

ผู้ช่วย AI สำหรับ Group Head Account Manager และ Sales Team 5 คนของ Plan B Media
สเปกที่ตกลงกันไว้ทั้งหมดอยู่ใน [SPEC.md](SPEC.md)

## สถานะ: Sprint 1–2 (ต้นแบบ)

| ฟีเจอร์ | สถานะ |
|---|---|
| Login (โหมดทดลอง: เลือกผู้ใช้) · ปุ่ม Google เตรียมไว้แล้ว | ✅ |
| ทีม 6 คน แยกสิทธิ์ Group Head / Sales | ✅ |
| บันทึก Activity ด้วยการพิมพ์หรือพูด (ภาษาไทย) → AI จัดเป็นข้อมูลให้ | ✅ |
| Pipeline 7 ขั้น (Kanban) ย้ายขั้นได้ แจ้งเตือน Deal ค้าง | ✅ |
| Team Dashboard: KPI รายคน เขียว/เหลือง/แดง, ยอด Won เดือน/ไตรมาส | ✅ |
| AI Coach สรุปทีม + คอมเมนต์โค้ชลง Activity ของลูกทีม | ✅ |
| Settings: เป้า KPI, เป้ายอดขาย, Portfolio | ✅ |
| **New Lead อัตโนมัติ** — อ่านข่าว 11 แหล่งทุกวันหลัง 08:00, คัดสัญญาณการซื้อ 6 แบบ, ให้คะแนน 0–100 | ✅ Sprint 2 |
| แจก Lead: เจ้าของแบรนด์ → วนรอบเซลส์ 1→5 (ข้ามคนลา/ถือเต็มเพดาน) → กองกลาง | ✅ Sprint 2 |
| เตือนก่อนครบ 7 วัน / ก่อนครบ 15 วัน · ครบ 15 วันไม่มี Activity คืนกองกลาง · ขอรับ/อนุมัติ | ✅ Sprint 2 |
| Head มอบหมายใหม่ได้ พร้อมคำแนะนำ (ถนัดหมวด / ถือ Lead น้อย / ยอด Won) | ✅ Sprint 2 |
| สรุป Lead เข้า LINE OA (ทั้งทีม + รายคน) · ไฟล์ scheduler 08:00 สำหรับ Netlify | ✅ Sprint 2 (ต้องตั้งค่า LINE) |
| AI Assistant · Pitch Studio · Knowledge Base | Sprint 3–4 |

## วิธีรัน

```bash
npm install
cp .env.example .env.local   # ใส่ ANTHROPIC_API_KEY เพื่อเปิด AI จริง
npm run dev
```

เปิด http://localhost:3000 แล้วเลือกผู้ใช้ (Pim = Group Head, ที่เหลือ = Sales)

- **ไม่มี API key**: ระบบยังใช้งานได้ โดยแปลงข้อความด้วยกฎพื้นฐาน และ AI Coach จะเป็นสรุปพื้นฐาน
- **มี API key**: แปลง Activity ด้วย `claude-haiku-5-5` (เร็ว ถูก) และ AI Coach ใช้ `claude-opus-5-5`
  (เปิด server-side fallback ไว้ ถ้าโมเดลหลักปฏิเสธคำขอ API จะส่งต่อให้โมเดลสำรองอัตโนมัติ)

## ตั้งค่า LINE (ส่ง Lead ทุกเช้า)

1. สร้าง LINE Official Account ที่ https://manager.line.biz แล้วเปิด Messaging API
2. ที่ LINE Developers Console → Channel → Messaging API → ออก **Channel access token** ใส่ใน `LINE_CHANNEL_ACCESS_TOKEN`
3. ให้ทีมเพิ่มเพื่อน OA — ถ้ายังไม่ใส่ LINE userId ใน Settings ระบบจะ broadcast สรุปทั้งทีมถึงทุกคน
4. แพ็กเกจฟรีของ LINE OA ส่งได้จำนวนจำกัดต่อเดือน (ทีม 6 คน × วันทำงาน ใช้ประมาณ 130 ข้อความ/เดือน)

## ข้อจำกัดของต้นแบบ

- ข้อมูลเก็บใน **localStorage ของเบราว์เซอร์แต่ละเครื่อง** ทีมยังไม่เห็นข้อมูลร่วมกัน
  เฟสถัดไปจะย้ายไป Supabase (โครงอยู่ใน [supabase/schema.sql](supabase/schema.sql) พร้อม Row Level Security)
- ชื่อคน แบรนด์ และ Agency ทั้งหมดเป็นข้อมูลสมมติ
- **การแจก Lead เกิดในเบราว์เซอร์ที่เปิดแอป** (สแกนอัตโนมัติครั้งแรกที่มีคนเปิดหลัง 08:00) เพราะยังไม่มีฐานข้อมูลกลาง
  ส่วน scheduler 08:00 (`netlify/functions/daily-leads.mts`) ส่งได้เฉพาะสรุปทั้งทีมเข้า LINE จนกว่าจะย้ายไป Supabase
- Positioning และ Thansettakij ไม่มี RSS จึงอ่านผ่าน Google News · ตัวคัดแบบกฎ (ไม่มี API key) แม่นน้อยกว่า AI มาก
- AI Coach อัตโนมัติทุกวันศุกร์ต้องมีเซิร์ฟเวอร์ตั้งเวลาและฐานข้อมูลกลาง
- การพูดแทนพิมพ์ใช้ Web Speech API (Chrome, Edge, Safari)

## โครงสร้าง

```
src/app/            หน้าเว็บ (Home, Activities, Pipeline, Team, Settings, Login) + API routes
src/app/api/        parse-activity, coach, leads/scan, line/send, cron/daily-leads, status
src/lib/            types, mock-data, store (localStorage), kpi, parse-rules, ai
                    feeds (RSS), lead-scan (AI คัด Lead), lead-rules (ตัวคัดสำรอง), lead-logic (แจก/เตือน/LINE), line
src/components/     AppShell, ActivityComposer, ActivityList, ui
supabase/schema.sql โครงฐานข้อมูลเฟสใช้ข้อมูลจริง
```
