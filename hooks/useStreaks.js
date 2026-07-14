import { useMemo } from 'react';
import { formatLocalDate, getDaysBetween } from '../lib/dateUtils';

/**
 * Computes logging streak data from income records.
 * All data is derived on-the-fly — no separate Firestore storage.
 */
export function useStreaks(incomes) {
  const streakData = useMemo(() => {
    if (!incomes || incomes.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastLoggedDate: null,
        milestones: [],
        streakStatus: 'broken',
      };
    }

    // Get unique sorted dates (ascending)
    const uniqueDates = [...new Set(incomes.map((i) => i.date).filter(Boolean))].sort();
    const lastLoggedDate = uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : null;

    const today = formatLocalDate(new Date());
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return formatLocalDate(d);
    })();

    // ── Current streak: count backward from today/yesterday ──
    let currentStreak = 0;
    let startCheckFrom = null;

    if (uniqueDates.includes(today)) {
      startCheckFrom = today;
    } else if (uniqueDates.includes(yesterday)) {
      startCheckFrom = yesterday;
    }

    if (startCheckFrom) {
      currentStreak = 1;
      let checkDate = new Date(startCheckFrom + 'T00:00:00');
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const dateStr = formatLocalDate(checkDate);
        if (uniqueDates.includes(dateStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // ── Longest streak ──
    let longestStreak = uniqueDates.length > 0 ? 1 : 0;
    let tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const diff = getDaysBetween(uniqueDates[i - 1], uniqueDates[i]);
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // ── Milestone badges ──
    const milestoneThresholds = [
      { days: 7, label: '7 วัน', emoji: '', description: 'บันทึกครบ 1 สัปดาห์' },
      { days: 14, label: '14 วัน', emoji: '', description: 'บันทึกครบ 2 สัปดาห์' },
      { days: 30, label: '30 วัน', emoji: '', description: 'บันทึกครบ 1 เดือน' },
      { days: 60, label: '60 วัน', emoji: '', description: 'บันทึกครบ 2 เดือน' },
      { days: 90, label: '90 วัน', emoji: '', description: 'บันทึกครบ 3 เดือน' },
    ];

    const milestones = milestoneThresholds.map((m) => ({
      ...m,
      achieved: longestStreak >= m.days,
    }));

    // ── Streak status ──
    const streakStatus = uniqueDates.includes(today)
      ? 'active'
      : uniqueDates.includes(yesterday)
        ? 'at_risk'
        : 'broken';

    return {
      currentStreak,
      longestStreak,
      lastLoggedDate,
      milestones,
      streakStatus,
    };
  }, [incomes]);

  return streakData;
}
