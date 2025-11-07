const defaultLocale = 'en';

export const formatDateTime = (value: string | Date | null, fallback = '—') => {
  if (!value) return fallback;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(defaultLocale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

export const formatDurationSeconds = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export const formatPercentage = (value: number, fractionDigits = 0) => {
  return `${(value * 100).toFixed(fractionDigits)}%`;
};
