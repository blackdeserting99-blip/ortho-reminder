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
