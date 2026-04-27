<div align="center">
  
# ✈️ Finvoy Wallet (ฟินวอย วอลเล็ท)
**แอปพลิเคชันจัดการรายจ่ายและการเดินทางอัจฉริยะ ครบจบในที่เดียว**

[เข้าสู่เว็บไซต์จริง (Live Demo)](https://my-trip-expense-bb153.web.app/)

</div>

---

## 🌟 ภาพรวมโปรเจกต์ (Project Overview)
**Finvoy Wallet** คือผู้ช่วยจัดการการเงินส่วนตัวที่ถูกออกแบบมาให้ "ครบวงจร" ที่สุด ไม่ว่าจะเป็นการใช้จ่ายในชีวิตประจำวัน หรือการเดินทางท่องเที่ยวต่างประเทศ ด้วยดีไซน์สไตล์ **Premium Modern UI** ที่เน้นความเรียบหรู ใช้งานง่าย และตอบสนองรวดเร็ว

หัวใจของ Finvoy Wallet คือการทำให้เรื่องเงินเป็นเรื่องง่าย ตั้งแต่การบันทึก การหารบิลกับเพื่อน ไปจนถึงการสรุปรายงานที่แม่นยำ

---

## ✨ ฟีเจอร์เด่น (Key Features)

### 1. 🤖 AI OCR Slip Scanner
บันทึกรายจ่ายได้ในไม่กี่วินาทีเพียงแค่ "อัปโหลดสลิป" ระบบ AI (Tesseract.js) จะสแกนหาวันที่ จำนวนเงิน และหมวดหมู่อัตโนมัติ ช่วยลดความยุ่งยากในการพิมพ์เอง

### 2. 💸 ระบบหารบิล & PromptPay (Split Bill)
*   **หารบิลอัจฉริยะ**: รองรับทั้งการหารเท่ากัน หรือระบุจำนวนที่แต่ละคนต้องจ่ายเอง
*   **ภาษี & เซอร์วิสชาร์จ**: คำนวณ VAT และ Service Charge แยกตามรายการได้แม่นยำ
*   **Canvas Receipt**: สร้างใบเสร็จ (Slip) สรุปยอดของทุกคนพร้อม QR Code PromptPay ในรูปเดียว ส่งให้เพื่อนสแกนจ่ายได้ทันที

### 3. 🤝 สรุปยอดค้างจ่าย (IOU & Debts)
*   **ใครติดเงินเราบ้าง?**: ระบบรวบรวมหนี้สินจากการหารบิลมาสรุปแยกตามรายชื่อเพื่อน
*   **ยืนยันการรับเงิน**: สามารถกดกางดูรายละเอียดแต่ละรายการ และกด "ยืนยันการรับเงิน" เพื่อหักลดยอดหนี้ได้แบบ Real-time

### 4. 🔄 รายจ่ายประจำ (Recurring Expenses)
บันทึกค่าใช้จ่ายที่ต้องจ่ายทุกเดือน (เช่น ค่าคอนโด, Netflix, ค่าเน็ต) ระบบจะช่วยเตือนและจัดการให้คุณไม่พลาดทุกรอบบิล

### 5. ✈️ การจัดการทริป (Smart Trip Management)
สร้างทริปแยกออกจากชีวิตประจำวัน เพื่อคุมงบประมาณท่องเที่ยวโดยเฉพาะ พร้อมระบบ **Budget Alert** แจ้งเตือนเมื่อใช้เงินใกล้เต็มงบ และ **Daily Limit** ควบคุมการใช้จ่ายรายวัน

### 6. 📊 รายงานวิเคราะห์เชิงลึก (Advanced Analytics)
*   สรุปยอดแยกตามหมวดหมู่ด้วยกราฟวงกลมสุดสวยงาม
*   กรองข้อมูลได้ละเอียด ทั้งแบบ **รายสัปดาห์ / รายเดือน / รายปี / ทั้งหมด**
*   **Exclude Trips**: เลือกดูเฉพาะรายจ่ายชีวิตประจำวันโดยไม่รวมทริปได้ เพื่อให้เห็นภาพรวมการใช้เงินที่แท้จริง

### 7. 📥 การส่งออกข้อมูล (Export to PDF/CSV)
สร้างรายงานสรุปในรูปแบบไฟล์ PDF ที่ดีไซน์มาอย่างพรีเมียม หรือไฟล์ CSV สำหรับนำไปวิเคราะห์ต่อใน Excel

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

*   **Frontend**: Next.js 14 (App Router), Tailwind CSS
*   **Backend/Database**: Firebase Firestore
*   **Authentication**: Firebase Auth (Google Login)
*   **OCR Engine**: Tesseract.js
*   **Charts**: Recharts
*   **PDF Generation**: jsPDF & AutoTable
*   **Icons**: Lucide React

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
แอปพลิเคชันรองรับการติดตั้งลงบนหน้าจอมือถือ (Add to Home Screen) ทั้งบน iOS และ Android เพื่อการใช้งานที่ลื่นไหลเหมือน Native App

---

© 2026 Finvoy Wallet Team. All rights reserved.
