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
  const [hours, minutes] = time24h.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}
