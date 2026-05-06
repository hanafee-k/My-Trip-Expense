<div align="center">
  
# ✈️ Finvoy Wallet (ฟินวอย วอลเล็ท)
**แอปพลิเคชันจัดการรายจ่ายและการเดินทางอัจฉริยะ ระดับพรีเมียม**

[เข้าสู่เว็บไซต์จริง (Live Demo)](https://my-trip-expense-bb153.web.app/)

</div>

---

## 🌟 ภาพรวมโปรเจกต์ (Project Overview)
**Finvoy Wallet** คือผู้ช่วยจัดการการเงินส่วนตัวที่ถูกออกแบบมาภายใต้แนวคิด "Seamless Expense & Trip Management" เพื่อยกระดับการบันทึกรายจ่ายให้เป็นเรื่องง่ายและสวยงามที่สุด ไม่ว่าจะเป็นการใช้จ่ายในชีวิตประจำวัน หรือการออกทริปเดินทางต่างประเทศ ด้วยดีไซน์สไตล์ **Premium Modern UI** ที่เน้นความเรียบหรู ตอบสนองรวดเร็ว และใช้งานง่ายในทุกมิติ

---

## ✨ ฟีเจอร์เด่น (Key Features)

### 1. 🤖 AI OCR Slip Scanner (Next-Gen)
บันทึกรายจ่ายได้แม่นยำในไม่กี่วินาทีเพียงแค่ "อัปโหลดสลิป" ระบบ AI (Tesseract.js 7.0) จะสแกนหาวันที่ จำนวนเงิน และวิเคราะห์หมวดหมู่อัตโนมัติ พร้อมระบบแจ้งเตือนหากพบข้อมูลไม่ชัดเจน

### 2. 💸 ระบบหารบิลอัจฉริยะ (Advanced Split Bill)
*   **Multi-Step Process**: ระบบหารบิลแบบเป็นขั้นตอน ตั้งแต่การระบุค่าธรรมเนียม (Service Charge/VAT) ส่วนลด ไปจนถึงการเลือกคนหารรายรายการ
*   **Custom Assignment**: รองรับการหารไม่เท่ากัน (Locked Shares) สำหรับกรณีที่บางคนสั่งเมนูพิเศษ
*   **Canvas Receipt Generator**: สร้างใบเสร็จ (Slip) สรุปยอดของทุกคนพร้อม QR Code PromptPay ในรูปแบบรูปภาพระดับมืออาชีพ ส่งให้เพื่อนสแกนจ่ายได้ทันที

### 3. 🤝 สรุปยอดค้างจ่าย (IOU & Aggregated Debts)
*   **Aggregated View**: รวบรวมยอดที่เพื่อนค้างจ่ายจากทุกลูกหนี้มาไว้ในที่เดียว
*   **Summary QR Slip**: สร้างสลิปรวมยอดค้างทั้งหมดของเพื่อนหนึ่งคน พร้อม QR Code สำหรับการคืนเงินแบบรวดเดียวจบ
*   **Confirm Settlement**: ยืนยันการรับเงินแบบ Real-time เพื่อตัดยอดหนี้อัตโนมัติ

### 4. 🔄 รายจ่ายประจำ (Recurring Automation)
ตั้งค่ารายจ่ายที่ต้องจ่ายเป็นประจำ (Subscription, ค่าเช่า, Netflix) ระบบจะทำการบันทึกเข้าสู่รายการล่าสุดให้คุณโดยอัตโนมัติเมื่อถึงกำหนดเวลา

### 5. ✈️ การจัดการทริป (Smart Trip Management)
สร้างทริปเพื่อแยกงบประมาณออกจากชีวิตประจำวัน พร้อมระบบ **Budget Alert** (แจ้งเตือนเมื่อใช้เกิน 80%) และ **Daily Limit** (ควบคุมการใช้จ่ายรายวัน) เพื่อไม่ให้งบบานปลายระหว่างเดินทาง

### 6. 📊 รายงานวิเคราะห์เชิงลึก (Advanced Analytics)
*   **Dynamic Dashboard**: แสดงกราฟวงกลมและกราฟแท่ง (Recharts) สรุปสัดส่วนการใช้เงิน
*   **Trip Comparison**: ระบบเปรียบเทียบการใช้จ่ายระหว่างทริปปัจจุบันกับทริปก่อนหน้า เพื่อวิเคราะห์พฤติกรรมการใช้เงิน
*   **Top Spending**: แสดง 3 อันดับรายการที่ใช้เงินมากที่สุดในแต่ละช่วงเวลา

### 7. 📥 การส่งออกข้อมูล (Professional Export)
ดาวน์โหลดรายงานสรุปในรูปแบบไฟล์ **PDF** ที่จัดเลย์เอาต์มาอย่างสวยงาม หรือไฟล์ **CSV** สำหรับนำไปใช้ในงานบัญชีต่อ

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

*   **Frontend**: Next.js 16 (App Router), React 19
*   **Styling**: Tailwind CSS 4.0 (Modern Engine)
*   **Backend/Database**: Firebase Firestore (Real-time Sync)
*   **Authentication**: Firebase Auth (Google Login)
*   **Engine & Tools**:
    *   **OCR**: Tesseract.js 7.0
    *   **Charts**: Recharts
    *   **PDF**: jsPDF & AutoTable
    *   **Icons**: Lucide React
    *   **Deployment**: Firebase Hosting

---

## 🚀 เริ่มต้นใช้งาน (Getting Started)

1. **Clone Project**
   ```bash
   git clone https://github.com/hanafee-k/My-Trip-Expense.git
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Environment Variables**
   สร้างไฟล์ `.env.local` และใส่ค่า Config จาก Firebase Project ของคุณ:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

---

## 📱 PWA Support
Finvoy Wallet รองรับการติดตั้งแบบ PWA (Progressive Web App) เพื่อให้คุณเข้าถึงแอปได้รวดเร็วเหมือน Native App บนหน้าจอโฮมของทั้ง iOS และ Android

---

© 2026 Finvoy Wallet Team. Developed with ❤️ for better financial life.

