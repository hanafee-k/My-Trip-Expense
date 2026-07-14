import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { getTodayDate, monthDiff } from '../lib/dateUtils';

export function useSavingGoals(userId) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `users/${userId}/savingGoals`),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setGoals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  const addGoal = useCallback(async (goalData) => {
    if (!userId) return;
    await addDoc(collection(db, `users/${userId}/savingGoals`), {
      ...goalData,
      status: 'active',
      createdDate: getTodayDate(),
      createdAt: serverTimestamp(),
    });
  }, [userId]);

  const updateGoal = useCallback(async (goalId, data) => {
    if (!userId) return;
    await updateDoc(doc(db, `users/${userId}/savingGoals`, goalId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, [userId]);

  const deleteGoal = useCallback(async (goalId) => {
    if (!userId) return;
    await deleteDoc(doc(db, `users/${userId}/savingGoals`, goalId));
  }, [userId]);

  const computeGoalProgress = useCallback((goal, incomes, spends, categories, savingStartDate) => {
    if (!goal || !categories.length) return null;

    const trackedCat = categories.find((c) => c.id === goal.trackCategoryId);
    if (!trackedCat) return null;

    // Filter incomes and spends since the later of savingStartDate or goal creation date
    const startDate = savingStartDate && savingStartDate > goal.createdDate
      ? savingStartDate
      : goal.createdDate;

    const relevantIncomes = incomes.filter((i) => i.date >= startDate);
    const relevantSpends = spends.filter(
      (s) =>
        s.date >= startDate &&
        (s.categoryId === goal.trackCategoryId || s.categoryName === goal.trackCategoryName)
    );

    const totalAllocated = relevantIncomes.reduce(
      (sum, inc) => sum + (inc.income * trackedCat.pct) / 100,
      0
    );
    const totalSpent = relevantSpends.reduce(
      (sum, sp) => sum + (Number(sp.amount) || 0),
      0
    );
    
    const initial = Number(trackedCat.initialBalance) || 0;
    const currentSaved = initial + totalAllocated - totalSpent;

    const today = getTodayDate();
    const monthsElapsed = Math.max(1, monthDiff(goal.createdDate, today));
    const monthsRemaining = Math.max(0, monthDiff(today, goal.targetDate));
    const currentMonthlyPace = currentSaved / monthsElapsed;
    const remaining = goal.targetAmount - currentSaved;
    const requiredMonthlyAmount =
      monthsRemaining > 0 ? remaining / monthsRemaining : remaining;

    // Projected completion at current pace
    let projectedDate = null;
    if (currentMonthlyPace > 0 && remaining > 0) {
      const monthsNeeded = remaining / currentMonthlyPace;
      const projected = new Date();
      projected.setMonth(projected.getMonth() + Math.ceil(monthsNeeded));
      projectedDate = projected.toLocaleDateString('th-TH', {
        month: 'long',
        year: 'numeric',
      });
    }

    const totalMonths = monthsElapsed + monthsRemaining;
    const expectedPace = totalMonths > 0 ? goal.targetAmount / totalMonths : goal.targetAmount;

    return {
      currentSaved: Math.max(0, currentSaved),
      targetAmount: goal.targetAmount,
      progressPercent: Math.min(
        100,
        (Math.max(0, currentSaved) / goal.targetAmount) * 100
      ),
      monthsElapsed,
      monthsRemaining,
      requiredMonthlyAmount: Math.max(0, requiredMonthlyAmount),
      currentMonthlyPace,
      projectedDate,
      isOnTrack: currentMonthlyPace >= expectedPace,
      shortfall: Math.max(0, requiredMonthlyAmount - currentMonthlyPace),
      remaining: Math.max(0, remaining),
      isCompleted: currentSaved >= goal.targetAmount,
    };
  }, []);

  return { goals, loading, addGoal, updateGoal, deleteGoal, computeGoalProgress };
}
