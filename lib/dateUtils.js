/**
 * Formats a Date object to YYYY-MM-DD string using LOCAL timezone (not UTC)
 * This ensures dates don't shift when the user is in a different timezone
 */
export const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getStartOfMonth = () => {
  const date = new Date();
  return formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1));
};

export const getEndOfMonth = () => {
  const date = new Date();
  return formatLocalDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
};

export const getStartOfWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  return formatLocalDate(new Date(date.setDate(diff)));
};

export const getStartOfYear = () => {
  const date = new Date();
  return formatLocalDate(new Date(date.getFullYear(), 0, 1));
};

export const getEndOfYear = () => {
  const date = new Date();
  return formatLocalDate(new Date(date.getFullYear(), 11, 31));
};

export const getTodayDate = () => {
  return formatLocalDate(new Date());
};

export const getDateRange = (period) => {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: getTodayDate(), end: getTodayDate() };
    
    case 'week':
      return { start: getStartOfWeek(), end: getTodayDate() };
    
    case 'month':
      return { start: getStartOfMonth(), end: getEndOfMonth() };
    
    case 'lastmonth': {
      // Get the first day of the previous month
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      // Get the last day of the previous month (day 0 of current month)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: formatLocalDate(lastMonthStart),
        end: formatLocalDate(lastMonthEnd)
      };
    }
    
    case 'year':
      return { start: getStartOfYear(), end: getEndOfYear() };
    
    case 'lastyear': {
      // Get full year before last: Jan 1 to Dec 31
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
      return {
        start: formatLocalDate(lastYearStart),
        end: formatLocalDate(lastYearEnd)
      };
    }
    
    case 'all':
      return { start: "1970-01-01", end: "2099-12-31" };
    
    default:
      return { start: getStartOfMonth(), end: getEndOfMonth() };
  }
};

export const formatDateThai = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const formatDateShortThai = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
};

export const formatThaiDateFromTimestamp = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
};

/** Returns the current local time as "HH:mm" */
export const getCurrentTime = () => {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
};

/**
 * Converts a Firestore Timestamp to YYYY-MM-DD date string using LOCAL timezone
 * This ensures the transaction date matches the local calendar day the user sees
 * @param {Timestamp} timestamp - Firestore Timestamp object
 * @returns {string} Date in YYYY-MM-DD format
 */
export const getLocalDateFromTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return "";
  return formatLocalDate(timestamp.toDate());
};

/**
 * Extracts "HH:mm" from a Firestore Timestamp in LOCAL timezone.
 * Falls back to getCurrentTime() if the timestamp is invalid.
 */
export const getTimeFromTimestamp = (ts) => {
  if (!ts?.toDate) return getCurrentTime();
  const d = ts.toDate();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
};

/**
 * Combines a "YYYY-MM-DD" date string and "HH:mm" time string
 * into a JS Date in LOCAL timezone (no UTC shift).
 */
export const combineDateAndTime = (dateStr, timeStr) =>
  new Date(`${dateStr}T${timeStr}:00`);

/**
 * Gets the date range for any specific month
 * @param {number} year - Full year (e.g., 2026)
 * @param {number} month - 0-indexed month (0=Jan, 11=Dec)
 */
export const getMonthRange = (year, month) => {
  const start = formatLocalDate(new Date(year, month, 1));
  const end = formatLocalDate(new Date(year, month + 1, 0));
  return { start, end };
};

/**
 * Gets the weeks of a specific month with date ranges
 * Week starts on Monday
 */
export const getWeeksOfMonth = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks = [];
  let current = new Date(firstDay);
  let weekNum = 1;

  while (current <= lastDay) {
    const weekStart = new Date(current);
    // Find end of week (Sunday) or end of month
    const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const weekEnd = new Date(current);
    weekEnd.setDate(current.getDate() + daysUntilSunday);
    
    if (weekEnd > lastDay) {
      weekEnd.setTime(lastDay.getTime());
    }

    const startLabel = weekStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const endLabel = weekEnd.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

    weeks.push({
      weekNum,
      start: formatLocalDate(weekStart),
      end: formatLocalDate(weekEnd),
      label: `สัปดาห์ ${weekNum} (${startLabel}–${endLabel})`
    });

    weekNum++;
    current = new Date(weekEnd);
    current.setDate(current.getDate() + 1);
  }

  return weeks;
};

/** Returns YYYY-MM key for a date */
export const getMonthKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

/** Returns Thai month label, e.g., "กรกฎาคม 2569" */
export const getMonthLabel = (year, month) => {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
};

/** Returns number of days between two YYYY-MM-DD strings */
export const getDaysBetween = (dateA, dateB) => {
  if (!dateA || !dateB) return 0;
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
};

/** Returns number of months between two date strings */
export const monthDiff = (dateA, dateB) => {
  if (!dateA || !dateB) return 0;
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
};
