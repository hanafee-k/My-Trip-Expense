<div align="center">
  
# ✈️ My Trip Expense (แอปพลิเคชันบันทึกรายจ่ายการเดินทาง)
**จัดการงบประมาณทริปในแบบที่โปรและง่ายที่สุด พร้อมฟีเจอร์ AI อ่านสลิปอัตโนมัติ**

[เข้าสู่เว็บไซต์จริง (Live Demo)](https://my-trip-expense-bb153.web.app/)

</div>

---

## 🌟 ภาพรวมโปรเจกต์ (Project Overview)
**My Trip Expense** เป็นแอปพลิเคชัน Web App แบบ PWA-ready ที่ถูกออกแบบมาเพื่อคนที่ชอบเดินทางแต่เจอปัญหาคุมงบไม่อยู่ ด้วยดีไซน์สไตล์ **Pro Dark Theme** (โทนสีดำ-เทาคาร์บอน ตัดด้วยเขียวน้ำทะเล) ที่ให้ความรู้สึกพรีเมียม สบายตา และดูทันสมัย

ตัวแอปสามารถใช้ "บันทึกรายรับ-รายจ่ายในชีวิตประจำวัน" ควบคู่ไปกับการ "บันทึกแยกตามแพลนทริปเที่ยว" ได้อย่างสมบูรณ์แบบ!

## ✨ ฟีเจอร์เด่นที่น่าสนใจ (Key Features)
1. **🤖 AI OCR Slip Scanner**: ไม่ต้องแมนนวลพิมพ์ตัวเลข! มีระบบ AI (Tesseract.js) ที่ทำหน้าที่สแกนหาวันที่ จำนวนเงิน และจัดหมวดหมู่อัตโนมัติจากการอัปโหลดภาพสลิปโอนเงิน (รันบน Local 100% ปลอดภัย)
2. **✈️ Smart Trip Management**: สร้างทริป (เช่น "ญี่ปุ่นใบไม้เปลี่ยนสี 2025") เพื่อแยกระบบกระเป๋าเงินออกจากชีวิตประจำวัน ทำให้รู้ตัวเลขการใช้จ่ายของทริปนั้นๆ ทันที
3. **📊 Real-time Dashboard & Analytics**: แดชบอร์ดสรุปยอดรวม (รายรับ, รายจ่าย, คงเหลือ) และรายงานอัตราส่วนค่าใช้จ่ายด้วยกราฟวงกลมสุดสวยงาม (Recharts)
4. **🔐 Secure Google Authentication**: ระบบสมัครสมาชิกและล็อกอินที่รวดเร็วและปลอดภัยที่สุดผ่าน Google Account โดย Firebase
5. **🕶️ Premium UI/UX**: หน้าตาแอปพลิเคชันรูปแบบ Dark Theme ที่ตอบสนองลื่นไหล (Responsive) จัดเต็มด้วยเอฟเฟกต์ Glassmorphism แบบเนียนตา
6. **📱 Mobile-First Design**: ออกแบบโดยยึดหน้าจอมือถือเป็นหลัก ใช้งานจากสมาร์ทโฟนได้เหมือนโหลดแอปมาวางบนเครื่อง

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### Frontend (หน้าบ้าน)
* **[Next.js 16+](https://nextjs.org/)** - React Framework ที่มาแรงที่สุด (ใช้งานแบบ Static Export)
* **[Tailwind CSS v3](https://tailwindcss.com/)** - สำหรับจัดการ UI และดีไซน์ทั้งหมด
* **[Tesseract.js](https://tesseract.projectnaptha.com/)** - Library สำหรับอ่านข้อความจากรูปภาพ (OCR) เพื่อประมวลผลสลิป
* **[Recharts](https://recharts.org/)** - สำหรับทำ Data Visualization และรายงาน Dashboard
* **[Lucide React](https://lucide.dev/)** - แพ็กเกจไอคอน UI ที่สวยงามและทันสมัย

### Backend & Service (หลังบ้าน)
* **[Firebase Authentication](https://firebase.google.com/docs/auth)** - สำหรับการยืนยันตัวตน (Google Sign-in)
* **[Firebase Cloud Firestore](https://firebase.google.com/docs/firestore)** - NoSQL Database ทำงานแบบ Real-time ผูกข้อมูลแน่นกับแต่ละบัญชี
* **[Firebase Hosting](https://firebase.google.com/docs/hosting)** - รันระบบเว็บประสิทธิภาพสูงผ่าน CDN ทั่วโลก

---

## 🚀 การติดตั้งและตั้งค่าสำหรับนักพัฒนา (Getting Started)

### 1. การ Clone โปรเจกต์
ดึงโค้ดลงมาที่เครื่องของคุณผ่าน Git:
```bash
git clone https://github.com/your-username/my-trip-expense.git
cd my-trip-expense
```

### 2. การติดตั้ง Dependencies
เปิด Terminal ในโฟลเดอร์โปรเจกต์และพิมพ์:
```bash
npm install
```

### 3. การตั้งค่า Environment Variables (การเชื่อมฐานข้อมูล)
สร้างไฟล์ที่ชื่อว่า `.env.local` ไว้ที่โฟลเดอร์นอกสุด (Root) และกรอกข้อมูล Project Settings ของ Firebase ของคุณ:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. รันระบบจำลอง (Development Server)
```bash
npm run dev
```
แอปจะรันที่พอร์ต `3000` คุณสามารถดูหน้าเว็บได้ที่ 👉 [http://localhost:3000](http://localhost:3000)

---

## 📦 การนำระบบขึ้นออนไลน์ (Production Deployment)

โปรเจกต์นี้ตั้งค่า `output: 'export'` ไว้ใน `next.config.mjs` ดังนั้นการนำขึ้นเว็บจริงจะใช้การคลายไฟล์ออกมาเป็น Static Files (HTML/CSS/JS) ทั้งหมด

ถ้าคุณต้องการขึ้น **Firebase Hosting** สามารถรันคำสั่งได้ดังนี้:

1. **สร้าง Build Production:**
```bash
npm run build
```
*(โค้ดทั้งหมดที่พร้อมใช้จะถูกสร้างไปไว้ในโฟลเดอร์ `/out`)*

2. **Deploy ขึ้นเซิร์ฟเวอร์:**
```bash
firebase deploy --only hosting
```
*(กรณีที่ยังไม่เคยใช้ต้องรัน `firebase login` เพื่อล็อกอินก่อนด้วยนะ)*

---

## 💡 โครงสร้างโฟลเดอร์ที่สำคัญ
* `/app` - โฟลเดอร์หลักสำหรับระบบ Routing ของ Next.js (หน้าเพจทั้งหมดอยู่ที่นี่)
* `/components` - โฟลเดอร์สำหรับแยก Component ต่างๆ (ถ้ามี)
* `/context` - สถานะส่วนกลาง (`AuthContext.js` เพื่อจัดการระบบ Login ผู้ใช้)
* `/lib` - ไฟล์ Configuration เช่น `firebase.js` สำหรับเชื่อมต่อ Database

---
