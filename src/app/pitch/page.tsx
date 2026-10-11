import { Presentation } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export default function PitchPage() {
  return (
    <ComingSoon
      icon={Presentation}
      title="Pitch Studio"
      subtitle="Idea → Key Visual → Mockup → Deck"
      sprint={4}
      features={[
        "ใส่ชื่อแบรนด์ แล้ว AI เสนอ 3 แนวคิดแคมเปญ พร้อม Key Visual, Headline และเหตุผล",
        "วาง Key Visual ลงบนรูปป้ายจริงของ Plan B ตามมุมมองจริง",
        "รวมเป็น Deck บน Google Slides ในคลิกเดียว (ไทยหรืออังกฤษ)",
      ]}
    />
  );
}
