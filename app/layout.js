// ไฟล์ src/app/layout.js

import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import RouteGuard from "../components/RouteGuard";
import "./globals.css";

export const metadata = {
  title: 'My Trip Expense - จัดการค่าใช้จ่ายการเดินทาง',
  description: 'แอปพลิเคชันบันทึกและจัดการค่าใช้จ่ายการเดินทางอย่างมืออาชีพ พร้อม OCR สแกนสลิป',
  keywords: 'expense tracker, trip expense, การจัดการค่าใช้จ่าย, สลิป OCR',
  authors: [{ name: 'My Trip Expense Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#09090b',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-zinc-900 text-white pb-24">
        <AuthProvider>
          <RouteGuard>
            <Navbar />
            <main className="max-w-2xl mx-auto p-4">{children}</main>
          </RouteGuard>
        </AuthProvider>
      </body>
    </html>
  );
}