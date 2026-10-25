/** Format a shipped figure in the visitor locale. Large values are billions. */
export function formatFigure(value, locale) {
  const loc = locale || (typeof navigator !== "undefined" ? navigator.language : "en");
  const n = Number(value);
  if (!Number.isFinite(n)) return "UNKNOWN";
  const abs = Math.abs(n);
  const fmt = new Intl.NumberFormat(loc, { maximumFractionDigits: 2 });
  if (abs >= 1e9) return fmt.format(n / 1e9) + " billion";
  return fmt.format(n);
}

export function formatDate(iso, locale) {
  const loc = locale || (typeof navigator !== "undefined" ? navigator.language : "en");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "UNKNOWN";
  return new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "short" }).format(d);
}
