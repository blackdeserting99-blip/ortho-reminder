export function formatDateDMY(dateString: string | undefined | null) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");
  if (year?.length === 4 && month && day) {
    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;

  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${parsed.getFullYear()}`;
}

export function convertTo12Hour(time24h: string): string {
  if (!time24h || typeof time24h !== 'string') return String(time24h ?? "");

  const normalized = time24h.trim();
  const ampmMatch = normalized.match(/^(1[0-2]|0?[1-9]):([0-5]\d)\s*([AaPp][Mm])$/);
  if (ampmMatch) {
    return `${String(Number(ampmMatch[1])).padStart(2, '0')}:${ampmMatch[2]} ${ampmMatch[3].toUpperCase()}`;
  }

  const timeMatch = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::\d{2})?$/);
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    const minute = timeMatch[2];
    const period = hour >= 12 ? 'PM' : 'AM';
    const hours12 = hour % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${minute} ${period}`;
  }

  return normalized;
}
