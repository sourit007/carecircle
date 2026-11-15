// Date and timezone utilities for CareCircle

export function getCircleDayRange(timeZone = 'UTC', baseDate = new Date()) {
  try {
    const validTz = timeZone || 'UTC';
    // Format current date in target timezone as YYYY-MM-DD
    const dtf = new Intl.DateTimeFormat('en-CA', {
      timeZone: validTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = dtf.format(baseDate); // "YYYY-MM-DD"

    // Calculate timezone offset difference
    const nowInTz = new Date(baseDate.toLocaleString('en-US', { timeZone: validTz }));
    const nowUtc = new Date(baseDate.toLocaleString('en-US', { timeZone: 'UTC' }));
    const diffMs = nowInTz.getTime() - nowUtc.getTime();

    // Midnight local in that timezone = midnight UTC minus diffMs
    const midnightLocalAsUtc = new Date(`${dateStr}T00:00:00.000Z`).getTime();
    const startUtc = new Date(midnightLocalAsUtc - diffMs);
    const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000 - 1);

    return {
      dateStr,
      startIso: startUtc.toISOString(),
      endIso: endUtc.toISOString(),
    };
  } catch (err) {
    console.error('Timezone calculation error:', err);
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return {
      dateStr: today.toISOString().split('T')[0],
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }
}

export function formatTimeInTz(isoStr, timeZone = 'UTC') {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone || 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch (e) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}

export function formatDateTimeInTz(isoStr, timeZone = 'UTC') {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone || 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch (e) {
    return date.toLocaleString();
  }
}

export function formatDateInTz(isoStr, timeZone = 'UTC') {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone || 'UTC',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch (e) {
    return date.toLocaleDateString();
  }
}

