import { BookOpen } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export default function KnowledgePage() {
  return (
    <ComingSoon
      icon={BookOpen}
      title="Knowledge Base"
      subtitle="คลังความรู้ที่ AI ใช้ตอบและทำงาน"
      sprint={3}
      features={[
        "ลากไฟล์ PDF, Excel, PPT มาวางได้ตลอดเวลา ระบบจัดหมวดให้อัตโนมัติ",
        "5 หมวด: สื่อและพื้นที่ / ราคา / ผลงาน / กฎระเบียบ / Playbook การขาย",
        "ข้อมูลลับเห็นเฉพาะคนในทีม และไม่ใส่ใน Deck ที่ส่งลูกค้า",
      ]}
    />
  );
}
