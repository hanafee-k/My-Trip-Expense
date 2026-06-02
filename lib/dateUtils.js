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
