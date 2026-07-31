import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy, where, getDocs
} from 'firebase/firestore';
import { getMonthKey, getTodayDate } from '../lib/dateUtils';

/**
 * Hook for managing fixed monthly expenses and installment payments.
 * 
 * Firestore collection: users/{userId}/fixedExpenses
 */
export function useFixedExpenses(userId) {
  const [expenses, setExpenses] = useState([]);
  const [spendsHistory, setSpendsHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Real-time listener for fixed expenses ──
  useEffect(() => {
    if (!userId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `users/${userId}/fixedExpenses`),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  // ── Real-time listener for allocation spends ──
  useEffect(() => {
    if (!userId) {
      setSpendsHistory([]);
      return;
    }

    const qSpends = query(
      collection(db, `users/${userId}/allocationSpends`),
      orderBy('date', 'desc')
    );

    const unsubSpends = onSnapshot(qSpends, (snap) => {
      setSpendsHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsubSpends();
  }, [userId]);

  // ── Current month key (e.g., "2026-07") ──
  const currentMonthKey = useMemo(() => getMonthKey(), []);

  // ── Add new expense ──
  const addExpense = useCallback(async (data) => {
    if (!userId) return;
    await addDoc(collection(db, `users/${userId}/fixedExpenses`), {
      name: data.name,
      type: data.type, // 'fixed' or 'installment'
      amount: Number(data.amount),
      dueDay: Number(data.dueDay) || 1,
      categoryId: data.categoryId || '',
      categoryName: data.categoryName || '',
      note: data.note || '',
      // Installment-specific fields
      totalInstallments: data.type === 'installment' ? Number(data.totalInstallments) || 0 : 0,
      paidInstallments: data.type === 'installment' ? Number(data.paidInstallments) || 0 : 0,
      lastPaidMonth: '',
      isActive: true,
      createdAt: serverTimestamp(),
    });
  }, [userId]);

  // ── Update expense ──
  const updateExpense = useCallback(async (expenseId, data) => {
    if (!userId) return;
    await updateDoc(doc(db, `users/${userId}/fixedExpenses`, expenseId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, [userId]);

  // ── Delete expense & associated spends ──
  const deleteExpense = useCallback(async (expenseId) => {
    if (!userId) return;
    await deleteDoc(doc(db, `users/${userId}/fixedExpenses`, expenseId));

    // Also delete any allocationSpends logged for this fixed expense
    try {
      const q = query(
        collection(db, `users/${userId}/allocationSpends`),
        where('fixedExpenseId', '==', expenseId)
      );
      const snap = await getDocs(q);
      snap.docs.forEach(async (d) => {
        await deleteDoc(doc(db, `users/${userId}/allocationSpends`, d.id));
      });
    } catch (e) {
      console.error("Failed to clean up associated spends:", e);
    }
  }, [userId]);

  // ── Delete a spend record directly ──
  const deleteSpendRecord = useCallback(async (spendId) => {
    if (!userId) return;
    await deleteDoc(doc(db, `users/${userId}/allocationSpends`, spendId));
  }, [userId]);

  // ── Mark as paid for current month ──
  // Creates a spend record in allocationSpends and updates expense status
  // Accepts optional customAmount for variable monthly expenses (e.g. TikTok PayLater, electricity bill)
  const markAsPaid = useCallback(async (expense, customAmount = null) => {
    if (!userId) return;

    const today = getTodayDate();
    const actualAmount = customAmount !== null && !isNaN(Number(customAmount)) && Number(customAmount) > 0
      ? Number(customAmount)
      : Number(expense.amount);

    // 1. Create a spend record in allocationSpends (auto-deduct from category)
    await addDoc(collection(db, `users/${userId}/allocationSpends`), {
      date: today,
      amount: actualAmount,
      categoryId: expense.categoryId,
      categoryName: expense.categoryName,
      note: `💳 ${expense.name}${expense.type === 'installment' ? ` (งวดที่ ${(expense.paidInstallments || 0) + 1}/${expense.totalInstallments})` : ' (ค่าใช้จ่ายประจำ)'}`,
      isFixedExpense: true,
      fixedExpenseId: expense.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Update the fixed expense record
    const updateData = {
      lastPaidMonth: currentMonthKey,
      updatedAt: serverTimestamp(),
    };

    // If installment, increment paid count
    if (expense.type === 'installment') {
      const newPaid = (expense.paidInstallments || 0) + 1;
      updateData.paidInstallments = newPaid;

      // Auto-deactivate if all installments paid
      if (newPaid >= expense.totalInstallments) {
        updateData.isActive = false;
      }
    }

    await updateDoc(doc(db, `users/${userId}/fixedExpenses`, expense.id), updateData);
  }, [userId, currentMonthKey]);

  // ── Computed: summary stats ──
  const summary = useMemo(() => {
    const activeExpenses = expenses.filter(e => e.isActive);
    const totalMonthly = activeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const paidThisMonth = activeExpenses.filter(e => e.lastPaidMonth === currentMonthKey);
    const paidAmount = paidThisMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const unpaidAmount = totalMonthly - paidAmount;

    const fixedExpenses = activeExpenses.filter(e => e.type === 'fixed');
    const installments = activeExpenses.filter(e => e.type === 'installment');

    return {
      totalMonthly,
      paidCount: paidThisMonth.length,
      totalCount: activeExpenses.length,
      paidAmount,
      unpaidAmount,
      fixedExpenses,
      installments,
    };
  }, [expenses, currentMonthKey]);

  // ── Helper: check if paid this month ──
  const isPaidThisMonth = useCallback((expense) => {
    return expense.lastPaidMonth === currentMonthKey;
  }, [currentMonthKey]);

  // ── Helper: get remaining installments ──
  const getRemainingInstallments = useCallback((expense) => {
    if (expense.type !== 'installment') return null;
    const remaining = (expense.totalInstallments || 0) - (expense.paidInstallments || 0);
    const remainingAmount = remaining * (expense.amount || 0);
    return {
      paid: expense.paidInstallments || 0,
      total: expense.totalInstallments || 0,
      remaining: Math.max(0, remaining),
      remainingAmount: Math.max(0, remainingAmount),
      progressPercent: expense.totalInstallments > 0
        ? ((expense.paidInstallments || 0) / expense.totalInstallments) * 100
        : 0,
    };
  }, []);

  return {
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
  };
}
