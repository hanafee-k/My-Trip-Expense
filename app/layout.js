// ไฟล์ src/app/layout.js

import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import RouteGuard from "../components/RouteGuard";
import "./globals.css";

export const metadata = { title: "NoodlePOS Tracker", description: "จดรายรับรายจ่าย" };

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