import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getMonthRange, getMonthKey, getMonthLabel, formatLocalDate } from '../lib/dateUtils';

/**
 * Computes monthly recap for last month and tracks dismissed state.
 * Shows recap once per month (on first visit of a new month).
 */
export function useMonthlyRecap(userId, incomes, spends, categories) {
  const [dismissedMonths, setDismissedMonths] = useState({});
  const [loadingDismissed, setLoadingDismissed] = useState(true);

  // Load dismissed state from Firestore
  useEffect(() => {
    if (!userId) {
      setLoadingDismissed(false);
      return;
    }
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, `users/${userId}/allocationConfig/recapDismissed`));
        if (snap.exists()) {
          setDismissedMonths(snap.data() || {});
        }
      } catch (e) {
        console.error('Failed to load recap dismissed state:', e);
      }
      setLoadingDismissed(false);
    };
    load();
  }, [userId]);

  // Get current and last month info
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const lastMonthKey = getMonthKey(lastMonthDate);
  const prevMonthKey = getMonthKey(prevMonthDate);

  const lastMonthRange = getMonthRange(lastMonthDate.getFullYear(), lastMonthDate.getMonth());
  const prevMonthRange = getMonthRange(prevMonthDate.getFullYear(), prevMonthDate.getMonth());

  const lastMonthLabel = getMonthLabel(lastMonthDate.getFullYear(), lastMonthDate.getMonth());

  // Compute recap data
  const recapData = useMemo(() => {
    if (!incomes.length || !categories.length) return null;

    const filterByRange = (items, range) =>
      items.filter((item) => item.date >= range.start && item.date <= range.end);

    // Last month data
    const lmIncomes = filterByRange(incomes, lastMonthRange);
    const lmSpends = filterByRange(spends, lastMonthRange);
    const lmTotalIncome = lmIncomes.reduce((s, i) => s + i.income, 0);
    const lmTotalSpent = lmSpends.reduce((s, sp) => s + (Number(sp.amount) || 0), 0);

    // Previous month data (for comparison)
    const pmIncomes = filterByRange(incomes, prevMonthRange);
    const pmSpends = filterByRange(spends, prevMonthRange);
    const pmTotalIncome = pmIncomes.reduce((s, i) => s + i.income, 0);
    const pmTotalSpent = pmSpends.reduce((s, sp) => s + (Number(sp.amount) || 0), 0);

    // Category breakdown for last month
    const categoryBreakdown = categories.map((cat) => {
      const allocated = lmIncomes.reduce(
        (s, inc) => s + (inc.income * cat.pct) / 100,
        0
      );
      const spent = lmSpends
        .filter((sp) => sp.categoryId === cat.id || sp.categoryName === cat.name)
        .reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
      const remaining = allocated - spent;

      // Previous month for comparison
      const pmAllocated = pmIncomes.reduce(
        (s, inc) => s + (inc.income * cat.pct) / 100,
        0
      );
      const pmCatSpent = pmSpends
        .filter((sp) => sp.categoryId === cat.id || sp.categoryName === cat.name)
        .reduce((s, sp) => s + (Number(sp.amount) || 0), 0);

      const spentChange = pmCatSpent > 0 ? ((spent - pmCatSpent) / pmCatSpent) * 100 : 0;

      return {
        ...cat,
        allocated,
        spent,
        remaining,
        pmAllocated,
        pmSpent: pmCatSpent,
        spentChange,
        status: spent <= allocated ? 'good' : 'over',
      };
    });

    // Total saved (first/savings category)
    const savingsCat = categoryBreakdown[0]; // Usually the savings category
    const totalSaved = savingsCat ? savingsCat.remaining : 0;
    const pmSavingsCat = savingsCat
      ? savingsCat.pmAllocated - savingsCat.pmSpent
      : 0;

    // Comparison percentages
    const incomeChange = pmTotalIncome > 0
      ? ((lmTotalIncome - pmTotalIncome) / pmTotalIncome) * 100
      : 0;
    const savingsChange = pmSavingsCat > 0
      ? ((totalSaved - pmSavingsCat) / pmSavingsCat) * 100
      : 0;

    // Generate highlights
    const highlights = [];

    if (incomeChange > 0) {
      highlights.push({
        emoji: '🎉',
        message: `รายรับเพิ่มขึ้น ${Math.abs(incomeChange).toFixed(0)}% จากเดือนก่อน`,
        type: 'positive',
      });
    } else if (incomeChange < -10) {
      highlights.push({
        emoji: '📉',
        message: `รายรับลดลง ${Math.abs(incomeChange).toFixed(0)}% จากเดือนก่อน`,
        type: 'warning',
      });
    }

    if (savingsChange > 0 && savingsCat) {
      highlights.push({
        emoji: '💰',
        message: `ออมเงินได้มากกว่าเดือนก่อน ${Math.abs(savingsChange).toFixed(0)}%!`,
        type: 'positive',
      });
    }

    // Find worst performing category (most over-spent)
    const overSpentCats = categoryBreakdown.filter((c) => c.spent > c.allocated);
    if (overSpentCats.length > 0) {
      const worst = overSpentCats.sort((a, b) => (b.spent - b.allocated) - (a.spent - a.allocated))[0];
      const overPercent = worst.allocated > 0
        ? (((worst.spent - worst.allocated) / worst.allocated) * 100).toFixed(0)
        : 0;
      highlights.push({
        emoji: '⚠️',
        message: `${worst.name} ใช้เกินงบ ${overPercent}%`,
        type: 'warning',
      });
    }

    // Find best performing category (most under-spent)
    const underSpentCats = categoryBreakdown
      .filter((c) => c.allocated > 0 && c.spent < c.allocated)
      .sort((a, b) => (b.allocated - b.spent) - (a.allocated - a.spent));
    if (underSpentCats.length > 0 && underSpentCats[0].allocated > 0) {
      const best = underSpentCats[0];
      const savedPercent = ((best.remaining / best.allocated) * 100).toFixed(0);
      highlights.push({
        emoji: '✨',
        message: `${best.name} เหลือเงิน ${savedPercent}% ของงบ — เยี่ยมมาก!`,
        type: 'positive',
      });
    }

    return {
      monthLabel: lastMonthLabel,
      monthKey: lastMonthKey,
      totalIncome: lmTotalIncome,
      totalSpent: lmTotalSpent,
      totalSaved,
      daysLogged: lmIncomes.length,
      categoryBreakdown,
      comparison: {
        incomeChange,
        savingsChange,
        prevTotalIncome: pmTotalIncome,
        prevTotalSpent: pmTotalSpent,
        prevTotalSaved: pmSavingsCat,
      },
      highlights,
    };
  }, [incomes, spends, categories, lastMonthRange, prevMonthRange, lastMonthLabel, lastMonthKey]);

  // Should show recap: new month + has data + not dismissed
  const shouldShowRecap = useMemo(() => {
    if (loadingDismissed) return false;
    if (!recapData || recapData.totalIncome === 0) return false;
    return !dismissedMonths[lastMonthKey];
  }, [recapData, dismissedMonths, lastMonthKey, loadingDismissed]);

  const dismissRecap = useCallback(async () => {
    const updated = { ...dismissedMonths, [lastMonthKey]: true };
    setDismissedMonths(updated);
    if (userId) {
      try {
        await setDoc(
          doc(db, `users/${userId}/allocationConfig/recapDismissed`),
          updated
        );
      } catch (e) {
        console.error('Failed to save recap dismissed state:', e);
      }
    }
  }, [userId, dismissedMonths, lastMonthKey]);

  return {
    recapData,
    shouldShowRecap,
    dismissRecap,
    lastMonthLabel,
  };
}
