type FormatSessionDateOptions = {
  language?: string;
  withRelative?: boolean;
};

export function formatSessionDateLabel(
  value: string,
  { language = "fr", withRelative = false }: FormatSessionDateOptions = {},
) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const isArabic = language.toLowerCase().startsWith("ar");
  const locale = isArabic ? "ar-DZ" : "fr-FR";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timePart = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  if (target.getTime() === today.getTime()) {
    const absolute = `${isArabic ? "اليوم" : "Aujourd’hui"} • ${timePart}`;
    return withRelative ? `${absolute} • ${formatRelative(date, locale)}` : absolute;
  }

  if (target.getTime() === tomorrow.getTime()) {
    const absolute = `${isArabic ? "غدًا" : "Demain"} • ${timePart}`;
    return withRelative ? `${absolute} • ${formatRelative(date, locale)}` : absolute;
  }

  const datePart = date.toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  const absolute = `${capitalizeFirst(datePart)} • ${timePart}`;
  return withRelative ? `${absolute} • ${formatRelative(date, locale)}` : absolute;
}

function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatRelative(target: Date, locale: string) {
  const diffMs = target.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absMs < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute");
  }
  if (absMs < day) {
    return rtf.format(Math.round(diffMs / hour), "hour");
  }
  return rtf.format(Math.round(diffMs / day), "day");
}
