// Helper formatting functions for dates, times, and roles

export function formatTime(timeStr) {
  if (!timeStr) return '';
  // Handles '08:00', '08:00:00', or ISO strings
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  }
  return timeStr;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const dateFormatted = formatDate(dateStr);
  const timeFormatted = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateFormatted} at ${timeFormatted}`;
}

export function getRoleBadgeConfig(role) {
  switch (role) {
    case 'elder':
      return {
        label: 'Elder',
        badgeBg: 'bg-amber-100 text-amber-950 border-amber-300',
        textColor: 'text-amber-700',
      };
    case 'caretaker':
      return {
        label: 'Caretaker',
        badgeBg: 'bg-emerald-100 text-emerald-950 border-emerald-300',
        textColor: 'text-emerald-700',
      };
    case 'family':
      return {
        label: 'Family Member',
        badgeBg: 'bg-sky-100 text-sky-950 border-sky-300',
        textColor: 'text-sky-700',
      };
    default:
      return {
        label: role,
        badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
        textColor: 'text-slate-700',
      };
  }
}

export function getDoseStatusConfig(status) {
  switch (status) {
    case 'taken':
      return {
        status: 'taken',
        label: 'Taken',
        badgeText: 'STATUS: TAKEN',
        badgeBg: 'bg-emerald-100 text-emerald-950 border-emerald-400',
        textColor: 'text-emerald-700',
        cardBg: 'border-emerald-200 bg-emerald-50/20',
        iconBg: 'bg-emerald-100 text-emerald-800',
      };
    case 'missed':
      return {
        status: 'missed',
        label: 'Missed',
        badgeText: 'STATUS: MISSED',
        badgeBg: 'bg-rose-100 text-rose-950 border-rose-400',
        textColor: 'text-rose-700',
        cardBg: 'border-rose-200 bg-rose-50/20',
        iconBg: 'bg-rose-100 text-rose-800',
      };
    case 'pending':
    default:
      return {
        status: 'pending',
        label: 'Pending',
        badgeText: 'STATUS: PENDING',
        badgeBg: 'bg-amber-100 text-amber-950 border-amber-400',
        textColor: 'text-amber-700',
        cardBg: 'border-slate-300 hover:border-blue-400 hover:shadow-md',
        iconBg: 'bg-blue-100 text-blue-800',
      };
  }
}


