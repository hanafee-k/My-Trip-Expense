import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import RouteGuard from "../components/RouteGuard";
import "./globals.css";
import { Noto_Sans_Thai, Inter } from "next/font/google";

const notoThai = Noto_Sans_Thai({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-noto-thai',
});

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

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
    <html lang="en" className={`${notoThai.variable} ${inter.variable}`}>
      <body className={`bg-[#F7F7F5] text-[#1A1A1A] selection:bg-[#E8622A]/30 font-sans`}>
        <AuthProvider>
          <RouteGuard>
            <Navbar />
            <main className="min-h-screen pb-24 lg:pb-0 lg:pl-60">
              {children}
            </main>
          </RouteGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
