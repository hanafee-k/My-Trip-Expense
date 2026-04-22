import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import RouteGuard from "../components/RouteGuard";
import "./globals.css";
import { Prompt } from "next/font/google";

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'],
  display: 'swap',
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
    <html lang="en">
      <body className={`bg-zinc-950 text-white selection:bg-teal-500/30 ${prompt.className}`}>
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
