import { Sparkles } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export default function AssistantPage() {
  return (
    <ComingSoon
      icon={Sparkles}
      title="AI Assistant"
      subtitle="ถามเรื่องแบรนด์ สื่อ ราคา กฎระเบียบ และกลยุทธ์"
      sprint={3}
      features={[
        "แชทภาษาไทยที่รู้จักลูกค้า Pipeline และ Knowledge Base ของทีม",
        "วางกลยุทธ์เข้าหาลูกค้าแต่ละราย และช่วย Head วางแผนให้ลูกทีม",
        "ร่างอีเมล follow-up ไว้ใน Gmail Drafts (ไม่ส่งเอง)",
        "เตรียม brief ก่อนพบลูกค้าจาก Google Calendar และสรุปการประชุม",
      ]}
    />
  );
}
