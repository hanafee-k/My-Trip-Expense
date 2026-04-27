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
