export const getStartOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
};

export const getEndOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
};

export const getStartOfWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  return new Date(date.setDate(diff)).toISOString().split('T')[0];
};

export const getStartOfYear = () => {
  const date = new Date();
  return new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
};

export const getTodayDate = () => new Date().toISOString().split('T')[0];

export const getDateRange = (period) => {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: getTodayDate(), end: getTodayDate() };
    case 'week':
      return { start: getStartOfWeek(), end: getTodayDate() };
    case 'month':
      return { start: getStartOfMonth(), end: getTodayDate() };
    case 'year':
      return { start: getStartOfYear(), end: getTodayDate() };
    case 'lastyear': {
      const start = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
      return { start, end };
    }
    case 'all':
      return { start: "1970-01-01", end: "2099-12-31" };
    default:
      return { start: getStartOfMonth(), end: getTodayDate() };
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
