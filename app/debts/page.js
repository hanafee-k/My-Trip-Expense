"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  collection, query, onSnapshot, orderBy, doc, updateDoc, getDocs
} from "firebase/firestore";
import {
  ArrowLeft, Users, DollarSign, CheckCircle2, 
  Trash2, Search, Filter, ArrowRight, User, Clock, AlertCircle, Smartphone, ScanLine, X, Download
} from "lucide-react";
import { useRouter } from "next/navigation";
import { generatePromptPayPayload } from "../../lib/promptpay";

export default function DebtsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promptPayId, setPromptPayId] = useState("");
  const [qrData, setQrData] = useState(null);
  const [expandedPerson, setExpandedPerson] = useState(null);

  const markAsPaid = async (sessionId, personId) => {
    if (!user) return;
    if (!confirm("ยืนยันว่าได้รับเงินรายการนี้แล้ว?")) return;
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;
      
      const newPaidStatus = { ...session.paidStatus, [personId]: true };
      await updateDoc(doc(db, `users/${user.uid}/splitSessions`, sessionId), {
        paidStatus: newPaidStatus
      });
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถอัปเดตสถานะได้");
    }
  };

  const downloadQR = async () => {
    if (!qrData) return;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 600;
      const itemHeight = qrData.items.length * 35;
      canvas.height = 850 + itemHeight;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#E8622A";
      ctx.fillRect(0, 0, canvas.width, 100);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("FINVOY WALLET", canvas.width / 2, 65);
      ctx.fillStyle = "#1A1A1A";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`ยอดค้างจ่ายของคุณ ${qrData.name}`, canvas.width / 2, 160);
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#6B6B6B";
      ctx.fillText(new Date().toLocaleDateString('th-TH', { dateStyle: 'long' }), canvas.width / 2, 190);

      ctx.strokeStyle = "#F3F4F6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(50, 220); ctx.lineTo(550, 220); ctx.stroke();

      ctx.textAlign = "left"; ctx.font = "bold 18px sans-serif"; ctx.fillStyle = "#1A1A1A";
      ctx.fillText("รายการที่ค้าง", 60, 260); ctx.textAlign = "right"; ctx.fillText("จำนวนเงิน", 540, 260);

      let currentY = 300;
      qrData.items.forEach(item => {
        ctx.textAlign = "left"; ctx.font = "18px sans-serif"; ctx.fillStyle = "#4B5563";
        ctx.fillText(item.name, 60, currentY); ctx.textAlign = "right"; ctx.fillText(item.share.toLocaleString(), 540, currentY);
        currentY += 35;
      });

      currentY += 20;
      ctx.fillStyle = "#F9FAFB"; ctx.roundRect(50, currentY, 500, 80, 20); ctx.fill();
      ctx.textAlign = "left"; ctx.font = "bold 20px sans-serif"; ctx.fillStyle = "#1A1A1A";
      ctx.fillText("รวมยอดที่ต้องชำระคืน", 80, currentY + 48);
      ctx.textAlign = "right"; ctx.font = "bold 32px sans-serif"; ctx.fillStyle = "#E8622A";
      ctx.fillText(`฿${qrData.amount.toLocaleString()}`, 520, currentY + 52);

      currentY += 120;
      ctx.textAlign = "center"; ctx.font = "bold 18px sans-serif"; ctx.fillStyle = "#1A1A1A";
      ctx.fillText("สแกนจ่ายผ่าน PromptPay", canvas.width / 2, currentY);
      currentY += 30;

      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData.payload)}`;
      await new Promise(resolve => {
        qrImg.onload = () => {
          ctx.drawImage(qrImg, canvas.width / 2 - 125, currentY, 250, 250);
          resolve();
        };
      });

      currentY += 280;
      ctx.fillStyle = "#6B6B6B"; ctx.font = "14px sans-serif";
      ctx.fillText("กรุณาชำระคืนเมื่อสะดวกนะครับ :)", canvas.width / 2, currentY + 20);
      ctx.fillText("สร้างโดยแอป Finvoy Wallet", canvas.width / 2, currentY + 45);

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a"); a.href = dataUrl; a.download = `IOU_${qrData.name}.png`; a.click();
    } catch (err) {
      console.error(err);
      alert("ดาวน์โหลดไม่สำเร็จ: " + err.message);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Fetch Split Sessions
    const q = query(collection(db, `users/${user.uid}/splitSessions`), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Fetch PromptPay ID
    const fetchProfile = async () => {
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) setPromptPayId(docSnap.data().promptPayId || "");
      } catch (err) { console.error(err); }
    };
    fetchProfile();

    return () => unsub();
  }, [user]);

  // Aggregate Debts by Person Name
  const debts = useMemo(() => {
    const map = {};
    sessions.forEach(session => {
      if (session.status === "settled") {
        Object.entries(session.personBreakdown || {}).forEach(([pid, p]) => {
          if (p.name === "คุณ") return; // Skip the user
          
          // Skip if already paid
          const isPaid = session.paidStatus && session.paidStatus[pid];
          if (isPaid) return;

          if (!map[p.name]) map[p.name] = { name: p.name, total: 0, sessions: [] };
          map[p.name].total += p.totalFinal;
          map[p.name].sessions.push({
             id: session.id,
             personId: pid, // Keep track of the person ID in this session
             amount: p.totalFinal,
             date: session.createdAt,
             tripName: session.tripId ? "Trip" : "ทั่วไป"
          });
        });
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [sessions]);

  if (!user) return null;

  return (
    <div className="min-h-screen pb-32 text-[#1A1A1A] bg-[#F7F6F3] font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="p-2 hover:bg-gray-100 rounded-full transition">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-xl font-black">สรุปยอดค้างจ่าย (IOU)</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ใครติดเงินคุณอยู่บ้าง?</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-[#E8622A]">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-8">
        
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-orange-100 border-t-[#E8622A] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm font-bold">กำลังรวบรวมข้อมูลยอดค้างจ่าย...</p>
          </div>
        ) : debts.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[40px] border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users size={32} className="text-gray-200" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">ไม่มีใครติดเงินคุณเลย!</h3>
            <p className="text-gray-400 text-sm">เมื่อคุณใช้ระบบหารบิล รายชื่อเพื่อนจะมาปรากฏที่นี่</p>
          </div>
        ) : (
          <div className="space-y-6">
             {/* Total Summary Card */}
             <div className="bg-[#1A1A1A] rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-orange-100/50">
               <div className="absolute top-0 right-0 p-8 opacity-10"><DollarSign size={100} /></div>
               <p className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-2">ยอดเงินทั้งหมดที่รอรับ</p>
               <h2 className="text-5xl font-black italic">฿{debts.reduce((sum, d) => sum + d.total, 0).toLocaleString()}</h2>
               <div className="flex items-center gap-2 mt-6">
                  <div className="flex -space-x-2">
                    {debts.slice(0, 3).map((d, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-[#1A1A1A] bg-orange-500 flex items-center justify-center text-[10px] font-black uppercase">
                        {d.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/40 ml-2">จากเพื่อน {debts.length} คน</p>
               </div>
             </div>

             <div className="space-y-4 pt-4">
                <h3 className="text-[13px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2">
                  <Users size={16} /> รายชื่อเพื่อนที่ค้างจ่าย
                </h3>
                {debts.map((debt, idx) => (
                  <div key={idx} className="bg-white rounded-[32px] p-6 border border-gray-50 shadow-lg shadow-gray-200/20 group hover:border-orange-100 transition-all">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-xl font-black text-[#E8622A] group-hover:bg-orange-50 transition-colors">
                          {debt.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black text-xl text-gray-900">{debt.name}</h4>
                          <p className="text-xs text-gray-400 font-bold">{debt.sessions.length} รายการที่ติดอยู่</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-[#E8622A]">฿{debt.total.toLocaleString()}</p>
                        <button 
                          onClick={() => setExpandedPerson(expandedPerson === debt.name ? null : debt.name)}
                          className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1 justify-end hover:text-[#E8622A] transition"
                        >
                          {expandedPerson === debt.name ? "ปิดรายละเอียด" : "ดูรายละเอียด"} <ArrowRight size={12} className={expandedPerson === debt.name ? 'rotate-90' : ''} />
                        </button>
                      </div>
                    </div>

                    {expandedPerson === debt.name && (
                      <div className="mt-6 pt-6 border-t border-gray-50 space-y-4 animate-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-4">
                          <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">รายการที่ยังไม่ได้รับเงิน</h5>
                          <button 
                            onClick={() => {
                              if (!promptPayId) {
                                alert("กรุณาตั้งค่า PromptPay ID ในหน้าโปรไฟล์ก่อนครับ");
                                router.push("/profile");
                                return;
                              }
                              setQrData({
                                name: debt.name,
                                amount: debt.total,
                                payload: generatePromptPayPayload(promptPayId, debt.total),
                                items: debt.sessions.map(s => ({ name: s.tripName || "รายการ", share: s.amount })),
                                adjustments: { discount: 0, serviceCharge: 0, vat: 0 }
                              });
                            }}
                            className="text-[11px] font-black text-[#E8622A] flex items-center gap-1"
                          >
                            <ScanLine size={14} /> สร้างสลิปรวม QR
                          </button>
                        </div>
                        
                        {debt.sessions.map((s, i) => (
                          <div key={i} className="bg-gray-50/50 p-4 rounded-2xl flex justify-between items-center">
                            <div>
                              <p className="text-sm font-black text-gray-800">{s.tripName}</p>
                              <p className="text-[10px] text-gray-400 font-bold italic">
                                {s.date?.toDate ? s.date.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'วันที่ไม่ระบุ'}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-lg font-black text-gray-900">฿{s.amount.toLocaleString()}</p>
                              <button 
                                onClick={() => markAsPaid(s.id, s.personId)}
                                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-500 shadow-sm border border-green-50 hover:bg-green-50 transition"
                                title="ยืนยันได้รับเงินแล้ว"
                              >
                                <CheckCircle2 size={20} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
             </div>
          </div>
        )}

      </div>
      {/* QR Modal */}
      {qrData && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[48px] p-8 text-center shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setQrData(null)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition"><X size={20}/></button>
            
            <div className="mb-6 pt-4">
              <h3 className="text-xl font-black mb-1">สแกนจ่ายคืน {user.displayName || 'ฉัน'}</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">จาก: {qrData.name}</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border-2 border-blue-500 mb-6 flex justify-center">
               <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData.payload)}`} 
                alt="PromptPay QR" 
                className="w-full max-w-[200px] h-auto"
               />
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl mb-8">
               <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">ยอดเงินรวมที่ค้างจ่าย</p>
               <p className="text-3xl font-black text-blue-600 italic">฿{qrData.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={downloadQR} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-2">
                <Download size={20} /> บันทึกรูป
              </button>
              <button onClick={() => setQrData(null)} className="flex-1 py-4 bg-[#1A1A1A] text-white rounded-2xl font-black shadow-xl">รับทราบ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
