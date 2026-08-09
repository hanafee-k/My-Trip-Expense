"use client";
import { useState, useMemo } from "react";
import { useFixedExpenses } from "../../hooks/useFixedExpenses";
import {
  CreditCard, PlusCircle, Loader2, Trash2, Edit2, X, Save,
  CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp,
  Building2, Smartphone, Receipt, Zap, Wifi, Car, Home,
  ShoppingBag, GraduationCap, Heart, MoreHorizontal
} from "lucide-react";

// ── Icon map for expense types ──
const EXPENSE_ICONS = {
  "หอ": Home, "บ้าน": Home, "ห้อง": Home,
  "โทรศัพท์": Smartphone, "มือถือ": Smartphone, "iphone": Smartphone, "samsung": Smartphone,
  "เน็ต": Wifi, "อินเทอร์เน็ต": Wifi, "wifi": Wifi,
  "ไฟ": Zap, "ไฟฟ้า": Zap,
  "รถ": Car, "ผ่อนรถ": Car, "น้ำมัน": Car,
  "เรียน": GraduationCap, "กู้": GraduationCap, "ค่าเทอม": GraduationCap,
  "ประกัน": Heart, "สุขภาพ": Heart,
  "ของ": ShoppingBag, "ช้อป": ShoppingBag,
};

function getExpenseIcon(name) {
  const lower = name.toLowerCase();
  for (const [keyword, IconComp] of Object.entries(EXPENSE_ICONS)) {
    if (lower.includes(keyword)) return IconComp;
  }
  return Receipt;
}

// ── Emoji for expense types ──
function getExpenseEmoji(name) {
  const lower = name.toLowerCase();
  if (lower.includes("tiktok") || lower.includes("paylater") || lower.includes("spaylater") || lower.includes("shoppee") || lower.includes("ช้อปปี้")) return "🛍️";
  if (lower.includes("หอ") || lower.includes("บ้าน") || lower.includes("ห้อง")) return "🏠";
  if (lower.includes("โทรศัพท์") || lower.includes("มือถือ") || lower.includes("iphone") || lower.includes("samsung")) return "📱";
  if (lower.includes("เน็ต") || lower.includes("wifi")) return "📶";
  if (lower.includes("ไฟ")) return "⚡";
  if (lower.includes("รถ")) return "🚗";
  if (lower.includes("เรียน") || lower.includes("กู้") || lower.includes("เทอม")) return "🎓";
  if (lower.includes("ประกัน") || lower.includes("สุขภาพ")) return "💊";
  return "💳";
}

export function FixedExpensesTab({ userId, categories }) {
  const {
    expenses,
    spendsHistory,
    loading,
    summary,
    currentMonthKey,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteSpendRecord,
    markAsPaid,
    isPaidThisMonth,
    getRemainingInstallments,
  } = useFixedExpenses(userId);

  const [showForm, setShowForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [payModalExpense, setPayModalExpense] = useState(null); // Modal for confirming/adjusting payment amount
  const [payingId, setPayingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // ── Current month label ──
  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }, []);

  // ── Separate active expenses by type ──
  const fixedList = useMemo(() =>
    expenses.filter(e => e.isActive && e.type === "fixed"), [expenses]
  );
  const installmentList = useMemo(() =>
    expenses.filter(e => e.isActive && e.type === "installment"), [expenses]
  );
  const completedList = useMemo(() =>
    expenses.filter(e => !e.isActive), [expenses]
  );

  // ── Handlers ──
  const handleAdd = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("ลบรายการนี้?")) return;
    await deleteExpense(id);
  };

  const handlePayClick = (expense) => {
    if (isPaidThisMonth(expense)) return;
    setPayModalExpense(expense);
  };

  const handleConfirmPay = async (expense, customAmount) => {
    setPayingId(expense.id);
    try {
      await markAsPaid(expense, customAmount);
      setPayModalExpense(null);
    } catch (err) {
      console.error("Failed to mark as paid:", err);
    }
    setPayingId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[#E8622A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ═══ Summary Card ═══ */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#E8622A]/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#E8622A]/5 rounded-full -ml-16 -mb-16 blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-[#E8622A]" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              ภาระค่าใช้จ่าย · {currentMonthLabel}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">ยอดรวมต้องจ่าย</p>
              <p className="text-xl font-black text-white">
                ฿{summary.totalMonthly.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1">จ่ายแล้ว</p>
              <p className="text-xl font-black text-emerald-400">
                ฿{summary.paidAmount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wider mb-1">เหลือต้องจ่าย</p>
              <p className="text-xl font-black text-amber-400">
                ฿{summary.unpaidAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-1.5">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${summary.totalCount > 0 ? (summary.paidCount / summary.totalCount) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-400 font-bold">
                {summary.paidCount}/{summary.totalCount} รายการ
              </span>
              <span className="text-gray-400 font-bold">
                {summary.totalCount > 0 ? Math.round((summary.paidCount / summary.totalCount) * 100) : 0}% เสร็จ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Action Buttons ═══ */}
      <div className="flex gap-3">
        <button
          onClick={handleAdd}
          className="flex-1 py-4 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 hover:text-[#E8622A] hover:border-[#E8622A]/40 hover:bg-orange-50 transition-all text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <PlusCircle size={18} strokeWidth={2.5} /> เพิ่มรายการจ่ายประจำ
        </button>
        <button
          onClick={() => setShowHistoryModal(true)}
          className="px-4 py-4 bg-white border border-gray-200 text-gray-600 hover:text-[#E8622A] hover:border-orange-200 rounded-3xl transition-all text-xs font-black flex items-center justify-center gap-1.5 shadow-xs shrink-0"
        >
          <Receipt size={16} /> ประวัติการหักเงิน
        </button>
      </div>

      {/* ═══ Fixed Monthly Expenses ═══ */}
      {fixedList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Building2 size={14} className="text-[#E8622A]" />
            <p className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider">
              ค่าใช้จ่ายประจำ ({fixedList.length})
            </p>
          </div>

          {fixedList.map((expense) => {
            const paid = isPaidThisMonth(expense);
            const emoji = getExpenseEmoji(expense.name);
            const isExpanded = expandedId === expense.id;

            return (
              <div key={expense.id} className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all ${paid ? 'border-emerald-100' : 'border-gray-100'}`}>
                <div className="p-4 flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                    paid ? 'bg-emerald-50' : 'bg-[#FFF4EF]'
                  }`}>
                    {emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-[#1A1A1A] truncate">{expense.name}</p>
                      {paid && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                      ฿{expense.amount.toLocaleString()}/เดือน · จ่ายวันที่ {expense.dueDay}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 flex items-center gap-1">
                    {paid ? (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-100">
                        ✅ จ่ายแล้ว
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePayClick(expense)}
                        disabled={payingId === expense.id}
                        className="px-4 py-2 bg-[#E8622A] hover:bg-[#d65722] text-white text-xs font-black rounded-xl transition shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {payingId === expense.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CreditCard size={12} />
                        )}
                        จ่ายเงิน
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                      className="p-2 text-gray-300 hover:text-gray-500 transition"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Actions */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    {expense.note && (
                      <p className="text-[10px] text-gray-400 font-medium flex-1 self-center">📝 {expense.note}</p>
                    )}
                    <button
                      onClick={() => handleEdit(expense)}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-amber-50 text-gray-400 hover:text-amber-600 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                    >
                      <Edit2 size={11} /> แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-500 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                    >
                      <Trash2 size={11} /> ลบ
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Installment Expenses ═══ */}
      {installmentList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Smartphone size={14} className="text-[#E8622A]" />
            <p className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider">
              รายการผ่อนชำระ ({installmentList.length})
            </p>
          </div>

          {installmentList.map((expense) => {
            const paid = isPaidThisMonth(expense);
            const emoji = getExpenseEmoji(expense.name);
            const installment = getRemainingInstallments(expense);
            const isExpanded = expandedId === expense.id;

            return (
              <div key={expense.id} className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all ${paid ? 'border-emerald-100' : 'border-gray-100'}`}>
                <div className="p-4 flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                    paid ? 'bg-emerald-50' : 'bg-[#FFF4EF]'
                  }`}>
                    {emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-[#1A1A1A] truncate">{expense.name}</p>
                      {paid && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                      ฿{expense.amount.toLocaleString()}/เดือน · จ่ายวันที่ {expense.dueDay}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 flex items-center gap-1">
                    {paid ? (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-100">
                        ✅ จ่ายแล้ว
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePayClick(expense)}
                        disabled={payingId === expense.id}
                        className="px-4 py-2 bg-[#E8622A] hover:bg-[#d65722] text-white text-xs font-black rounded-xl transition shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {payingId === expense.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CreditCard size={12} />
                        )}
                        จ่าย ฿{expense.amount.toLocaleString()}
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                      className="p-2 text-gray-300 hover:text-gray-500 transition"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Installment Progress */}
                {installment && (
                  <div className="px-4 pb-3 space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-400 font-bold">
                        📊 งวดที่ {installment.paid}/{installment.total} (เหลือ {installment.remaining} งวด)
                      </span>
                      <span className="text-gray-500 font-black">
                        ยอดคงเหลือ ฿{installment.remainingAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#E8622A] to-[#ff8c5a] rounded-full transition-all duration-1000"
                        style={{ width: `${installment.progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold text-right">
                      {installment.progressPercent.toFixed(0)}% ผ่อนชำระแล้ว
                    </p>
                  </div>
                )}

                {/* Expanded Actions */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    {expense.note && (
                      <p className="text-[10px] text-gray-400 font-medium flex-1 self-center">📝 {expense.note}</p>
                    )}
                    <button
                      onClick={() => handleEdit(expense)}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-amber-50 text-gray-400 hover:text-amber-600 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                    >
                      <Edit2 size={11} /> แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-500 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                    >
                      <Trash2 size={11} /> ลบ
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Completed Installments ═══ */}
      {completedList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
              ผ่อนครบแล้ว ({completedList.length})
            </p>
          </div>

          {completedList.map((expense) => (
            <div key={expense.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-4 opacity-60">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-lg shrink-0">
                {getExpenseEmoji(expense.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-500 truncate line-through">{expense.name}</p>
                <p className="text-[10px] text-gray-400 font-bold">
                  ✅ ผ่อนครบ {expense.totalInstallments} งวดแล้ว · ฿{expense.amount.toLocaleString()}/งวด
                </p>
              </div>
              <button
                onClick={() => handleDelete(expense.id)}
                className="p-2 text-gray-300 hover:text-rose-400 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Empty State ═══ */}
      {expenses.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-400 font-black text-base">ยังไม่มีรายการจ่ายประจำ</p>
          <p className="text-gray-300 text-xs mt-1 mb-6 max-w-xs mx-auto">
            เพิ่มรายการค่าใช้จ่ายที่ต้องจ่ายเป็นประจำทุกเดือน เช่น ค่าหอ, TikTok PayLater, ค่าผ่อนสินค้า เพื่อให้ระบบช่วยบริหารจัดการให้
          </p>
          <button
            onClick={handleAdd}
            className="py-3 px-6 bg-[#E8622A] hover:bg-[#d65722] text-white font-black rounded-2xl transition shadow-md active:scale-95"
          >
            + เพิ่มรายการแรก
          </button>
        </div>
      )}

      {/* ═══ Info Card ═══ */}
      {expenses.length > 0 && (
        <div className="bg-[#FFF4EF] rounded-2xl p-4 border border-orange-100 space-y-2">
          <p className="text-[10px] text-[#E8622A] font-black uppercase tracking-widest">💡 วิธีใช้งาน</p>
          <ul className="text-[11px] text-orange-900/70 font-medium space-y-1 leading-relaxed">
            <li>• กดปุ่ม <strong className="text-[#E8622A]">&quot;จ่ายเงิน&quot;</strong> เพื่อเปิดหน้าต่างระบุยอดเงินที่จ่ายจริงของเดือนนั้นๆ (เช่น TikTok PayLater, ค่าน้ำ, ค่าไฟ) ระบบจะหักยอดจากหมวดหมู่ที่ตั้งไว้ให้อัตโนมัติ</li>
            <li>• สถานะจะรีเซ็ตเป็น <strong>&quot;ยังไม่ได้จ่าย&quot;</strong> ทุกต้นเดือนใหม่อัตโนมัติ</li>
            <li>• รายการผ่อนชำระจะถูกปิดอัตโนมัติเมื่อผ่อนครบทุกงวด</li>
          </ul>
        </div>
      )}

      {/* ═══ Spend History Modal ═══ */}
      {showHistoryModal && (
        <SpendHistoryModal
          spends={spendsHistory}
          onClose={() => setShowHistoryModal(false)}
          onDelete={async (spendId) => {
            if (confirm("คุณแน่ใจหรือไม่ที่จะลบรายการหักเงินนี้? ยอดเงินจะคืนเข้ากระปุกทันที")) {
              await deleteSpendRecord(spendId);
            }
          }}
        />
      )}

      {/* ═══ Pay Confirmation Modal ═══ */}
      {payModalExpense && (
        <PayConfirmationModal
          expense={payModalExpense}
          submitting={payingId === payModalExpense.id}
          onClose={() => setPayModalExpense(null)}
          onConfirm={(customAmt) => handleConfirmPay(payModalExpense, customAmt)}
        />
      )}

      {/* ═══ Form Modal ═══ */}
      {showForm && (
        <FixedExpenseForm
          expense={editingExpense}
          categories={categories}
          onClose={() => { setShowForm(false); setEditingExpense(null); }}
          onSubmit={async (data) => {
            if (editingExpense) {
              await updateExpense(editingExpense.id, data);
            } else {
              await addExpense(data);
            }
            setShowForm(false);
            setEditingExpense(null);
          }}
        />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// FixedExpenseForm - Modal for adding/editing expenses
// ═══════════════════════════════════════════════════════
function FixedExpenseForm({ expense, categories, onClose, onSubmit }) {
  const defaultCategory = useMemo(() => {
    return categories.find(c => c.name.includes("ใช้") || c.id === "spend") || categories[0];
  }, [categories]);

  const [form, setForm] = useState({
    name: expense?.name || "",
    type: expense?.type || "fixed",
    amount: expense?.amount?.toString() || "",
    dueDay: expense?.dueDay?.toString() || "1",
    categoryId: expense?.categoryId || defaultCategory?.id || "",
    categoryName: expense?.categoryName || defaultCategory?.name || "",
    note: expense?.note || "",
    totalInstallments: expense?.totalInstallments?.toString() || "",
    paidInstallments: expense?.paidInstallments?.toString() || "0",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleCategoryChange = (catId) => {
    if (catId === 'none') {
      setForm(f => ({ ...f, categoryId: 'none', categoryName: 'ไม่หักจากหมวดใด' }));
    } else {
      const cat = categories.find(c => c.id === catId);
      setForm(f => ({ ...f, categoryId: catId, categoryName: cat?.name || "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.amount) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        type: form.type,
        amount: Number(form.amount),
        dueDay: Number(form.dueDay) || 1,
        categoryId: form.categoryId,
        categoryName: form.categoryName,
        note: form.note.trim(),
        totalInstallments: form.type === "installment" ? Number(form.totalInstallments) || 0 : 0,
        paidInstallments: form.type === "installment" ? Number(form.paidInstallments) || 0 : 0,
        isActive: true,
      });
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  // Preview: total cost for installments
  const totalInstallmentCost = form.type === "installment" && form.amount && form.totalInstallments
    ? Number(form.amount) * Number(form.totalInstallments)
    : null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-500 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFF4EF] rounded-2xl flex items-center justify-center">
              <CreditCard size={20} className="text-[#E8622A]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#1A1A1A]">
                {expense ? "แก้ไขรายการ" : "เพิ่มรายการจ่ายประจำ"}
              </h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Fixed Expense / Installment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Type Toggle */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">ประเภท</label>
            <div className="flex bg-gray-50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: "fixed" }))}
                className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  form.type === "fixed" ? "bg-white text-[#E8622A] shadow-sm" : "text-gray-400"
                }`}
              >
                <Building2 size={13} /> ค่าใช้จ่ายประจำ
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: "installment" }))}
                className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  form.type === "installment" ? "bg-white text-[#E8622A] shadow-sm" : "text-gray-400"
                }`}
              >
                <Smartphone size={13} /> ผ่อนชำระ
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
              {form.type === "fixed" ? "ชื่อค่าใช้จ่าย" : "ชื่อรายการผ่อน"}
            </label>
            <input
              type="text"
              placeholder={form.type === "fixed" ? "เช่น ค่าหอพัก, ค่าเน็ต, ค่าน้ำ-ไฟ..." : "เช่น ผ่อน iPhone, ผ่อนคอมพิวเตอร์..."}
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              required
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-bold focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50 placeholder:text-gray-300"
            />
          </div>

          {/* Amount & Due Day */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">ยอดจ่าย/เดือน</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">฿</span>
                <input
                  type="number" step="0.01" min="1" placeholder="2,500"
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-2xl pl-8 pr-4 py-3.5 text-lg font-black text-[#E8622A] focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50 placeholder:text-gray-300"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">กำหนดจ่ายวันที่</label>
              <input
                type="number" min="1" max="31" placeholder="5"
                value={form.dueDay}
                onChange={(e) => setForm(f => ({ ...f, dueDay: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-bold focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50 placeholder:text-gray-300 text-center"
              />
            </div>
          </div>

          {/* Installment-specific fields */}
          {form.type === "installment" && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">จำนวนงวดทั้งหมด</label>
                <div className="relative">
                  <input
                    type="number" min="1" max="120" placeholder="10"
                    value={form.totalInstallments}
                    onChange={(e) => setForm(f => ({ ...f, totalInstallments: e.target.value }))}
                    required
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-bold focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50 placeholder:text-gray-300 text-center"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">งวด</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">จ่ายไปแล้ว (งวด)</label>
                <div className="relative">
                  <input
                    type="number" min="0" max={form.totalInstallments || 999} placeholder="0"
                    value={form.paidInstallments}
                    onChange={(e) => setForm(f => ({ ...f, paidInstallments: e.target.value }))}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-bold focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50 placeholder:text-gray-300 text-center"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">งวด</span>
                </div>
              </div>
            </div>
          )}

          {/* Installment Cost Preview */}
          {totalInstallmentCost && (
            <div className="bg-[#FFF4EF] rounded-2xl px-4 py-3 border border-orange-100 animate-in fade-in duration-300 space-y-1">
              <p className="text-[10px] text-[#E8622A] font-black uppercase tracking-widest">สรุปยอดผ่อน</p>
              <div className="flex justify-between text-sm">
                <span className="text-orange-900/70 font-bold">ยอดรวมทั้งหมด</span>
                <span className="font-black text-[#E8622A]">฿{totalInstallmentCost.toLocaleString()}</span>
              </div>
              {form.paidInstallments > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-orange-900/70 font-bold">ยอดคงเหลือ</span>
                  <span className="font-black text-[#E8622A]">
                    ฿{((Number(form.totalInstallments) - Number(form.paidInstallments)) * Number(form.amount)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}



          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">หมายเหตุ (ไม่จำเป็น)</label>
            <input
              type="text"
              placeholder="เช่น บัตร KTC 0% 10 เดือน..."
              value={form.note}
              onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-medium focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50 placeholder:text-gray-300"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#E8622A] hover:bg-[#d65722] disabled:bg-gray-200 disabled:text-gray-400 text-white font-black rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3 text-base active:scale-[0.98]"
          >
            {submitting ? (
              <><Loader2 size={20} className="animate-spin" /> กำลังบันทึก...</>
            ) : expense ? (
              <><Save size={20} /> อัปเดตรายการ</>
            ) : (
              <><PlusCircle size={20} /> เพิ่มรายการ</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// PayConfirmationModal - Quick Modal to confirm or change
// payment amount for variable bills like TikTok PayLater
// ═══════════════════════════════════════════════════════
function PayConfirmationModal({ expense, submitting, onClose, onConfirm }) {
  const [payAmount, setPayAmount] = useState(expense?.amount?.toString() || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;
    onConfirm(amt);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-500">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFF4EF] rounded-2xl flex items-center justify-center text-xl">
              {getExpenseEmoji(expense.name)}
            </div>
            <div>
              <h3 className="text-lg font-black text-[#1A1A1A]">ยืนยันการชำระเงิน</h3>
              <p className="text-xs text-[#E8622A] font-bold mt-0.5">{expense.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1.5">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">รายละเอียดการชำระ</p>

            {expense.type === "installment" && (
              <p className="text-xs font-bold text-gray-700">
                • งวดชำระ: <span className="font-black text-gray-800">งวดที่ {(expense.paidInstallments || 0) + 1} จาก {expense.totalInstallments} งวด</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                ยอดเงินที่จ่ายจริงเดือนนี้ (บาท)
              </label>
              <span className="text-[10px] text-[#E8622A] font-bold">ปรับเปลี่ยนตัวเลขได้</span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">฿</span>
              <input
                type="number" step="0.01" min="1" autoFocus
                value={payAmount} required
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 py-4 text-2xl font-black text-[#E8622A] focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50"
              />
            </div>
            <p className="text-[10px] text-gray-400 font-medium px-1">
              💡 สำหรับรายการที่ยอดไม่เท่ากันทุกเดือน (เช่น TikTok PayLater, ค่าน้ำ, ค่าไฟ) สามารถแก้ตัวเลขยอดจริงของเดือนนี้ได้เลยครับ
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !payAmount || parseFloat(payAmount) <= 0}
            className="w-full py-4 bg-[#E8622A] hover:bg-[#d65722] disabled:bg-gray-200 disabled:text-gray-400 text-white font-black rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 text-base active:scale-[0.98]"
          >
            {submitting ? (
              <><Loader2 size={20} className="animate-spin" /> กำลังบันทึก...</>
            ) : (
              <><CheckCircle2 size={20} /> ยืนยันชำระ ฿{Number(payAmount || 0).toLocaleString()}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// SpendHistoryModal - View and delete spend transactions
// ═══════════════════════════════════════════════════════
function SpendHistoryModal({ spends = [], onClose, onDelete }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-500 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center">
              <Receipt size={20} className="text-[#E8622A]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#1A1A1A]">ประวัติการหักเงินจัดสรร</h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Spend History Log</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>

        {/* Body List */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1">
          {spends.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium text-xs">
              ยังไม่มีประวัติการหักเงิน
            </div>
          ) : (
            spends.map((sp) => (
              <div key={sp.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-gray-800 truncate">{sp.note || "รายการหักเงิน"}</p>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-orange-100 text-[#E8622A] rounded-md shrink-0">
                      {sp.categoryName || "หักใช้เงิน"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                    📅 {sp.date}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-black text-rose-500">
                    -฿{Number(sp.amount || 0).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleDelete(sp.id)}
                    disabled={deletingId === sp.id}
                    title="ลบรายการนี้เพื่อคืนเงินเข้ากระปุก"
                    className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition"
                  >
                    {deletingId === sp.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-orange-50/60 border-t border-orange-100/60 text-center shrink-0">
          <p className="text-[10px] text-orange-900/70 font-medium">
            💡 กดไอคอนถังขยะ 🗑️ หากต้องการยกเลิกการหักเงิน ยอดเงินจะถูกคืนเข้ากระปุกทันที
          </p>
        </div>
      </div>
    </div>
  );
}


