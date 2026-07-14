"use client";
import { useState } from "react";
import { useSavingGoals } from "../../hooks/useSavingGoals";
import { SavingGoalCard } from "./SavingGoalCard";
import { SavingGoalForm } from "./SavingGoalForm";
import { Target, PlusCircle, Loader2 } from "lucide-react";

export function GoalsTab({ userId, incomes, spends, categories, savingStartDate }) {
  const {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    computeGoalProgress,
  } = useSavingGoals(userId);

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setShowForm(true);
  };

  const handleOpenEdit = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleDelete = async (goalId) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบเป้าหมายการออมนี้?")) {
      try {
        await deleteGoal(goalId);
      } catch (err) {
        console.error("Failed to delete goal:", err);
      }
    }
  };

  const handleSubmit = async (goalData) => {
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, goalData);
      } else {
        await addGoal(goalData);
      }
      setShowForm(false);
    } catch (err) {
      console.error("Failed to save goal:", err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[#E8622A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-[#1A1A1A] flex items-center gap-2">
            <Target size={16} className="text-[#E8622A]" />
            เป้าหมายการออมเงินระยะยาว
          </h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
            ติดตามและคำนวณเงินออมสะสมของคุณ
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#E8622A] hover:bg-[#d65722] text-white text-xs font-black rounded-xl transition shadow-md shadow-orange-500/20 active:scale-95"
        >
          <PlusCircle size={14} /> เพิ่มเป้าหมาย
        </button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-400 font-black">ยังไม่มีเป้าหมายการออม</p>
          <p className="text-gray-300 text-xs mt-1 mb-6">
            เริ่มตั้งเป้าหมายเพื่อให้ระบบช่วยคำนวณและรายงานความคืบหน้า
          </p>
          <button
            onClick={handleOpenAdd}
            className="py-3 px-6 bg-[#E8622A] hover:bg-[#d65722] text-white font-black rounded-2xl transition shadow-md"
          >
            สร้างเป้าหมายแรกของคุณ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {goals.map((goal) => {
            const progress = computeGoalProgress(goal, incomes, spends, categories, savingStartDate);
            return (
              <SavingGoalCard
                key={goal.id}
                goal={goal}
                progress={progress}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Goal Form Modal */}
      <SavingGoalForm
        show={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        categories={categories}
        editGoal={editingGoal}
      />
    </div>
  );
}
