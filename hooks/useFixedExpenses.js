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

  // ── One-time & real-time cleanup for fixed expense spends so they NEVER deduct from pockets ──
  useEffect(() => {
    if (!userId) return;

    // Purge any existing isFixedExpense spend records from allocationSpends collection
    const purgeFixedSpends = async () => {
      try {
        const qFixedSpends = query(
          collection(db, `users/${userId}/allocationSpends`),
          where('isFixedExpense', '==', true)
        );
        const snap = await getDocs(qFixedSpends);
        snap.docs.forEach(async (d) => {
          await deleteDoc(doc(db, `users/${userId}/allocationSpends`, d.id));
        });
      } catch (e) {
        console.error("Purge fixed spends error:", e);
      }
    };
    purgeFixedSpends();
  }, [userId]);

  // ── Real-time listener for fixed expenses ──
  useEffect(() => {
    if (!userId) return;

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
    if (!userId) return;

    const qSpends = query(
      collection(db, `users/${userId}/allocationSpends`),
      orderBy('date', 'desc')
    );

    const unsubSpends = onSnapshot(qSpends, (snap) => {
      // Filter out any fixed expense spends
      const filtered = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => !s.isFixedExpense && !s.fixedExpenseId);
      setSpendsHistory(filtered);
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

  // ── Delete expense ──
  const deleteExpense = useCallback(async (expenseId) => {
    if (!userId) return;
    await deleteDoc(doc(db, `users/${userId}/fixedExpenses`, expenseId));
  }, [userId]);

  // ── Delete a spend record directly ──
  const deleteSpendRecord = useCallback(async (spendId) => {
    if (!userId) return;
    await deleteDoc(doc(db, `users/${userId}/allocationSpends`, spendId));
  }, [userId]);

  // ── Mark as paid for current month ──
  // ONLY updates fixed expense status (lastPaidMonth / paidInstallments). DOES NOT deduct from any category/pocket!
  const markAsPaid = useCallback(async (expense, customAmount = null) => {
    if (!userId) return;

    const updateData = {
      lastPaidMonth: currentMonthKey,
      updatedAt: serverTimestamp(),
    };

    // If installment, increment paid count
    if (expense.type === 'installment') {
      const newPaid = (expense.paidInstallments || 0) + 1;
      updateData.paidInstallments = newPaid;
      if (expense.totalInstallments > 0 && newPaid >= expense.totalInstallments) {
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
