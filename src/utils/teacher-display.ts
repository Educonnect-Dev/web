const ALREADY_PREFIXED_PATTERNS = [/^prof\b/i, /^professeur\b/i, /^prf\b/i, /^(الأستاذ|أستاذ|استاذ)\b/u];

export function formatTeacherDisplayName(name: string, teacherLabel: string): string {
  const cleanedName = name.trim();
  if (!cleanedName) return teacherLabel;

  const isAlreadyPrefixed = ALREADY_PREFIXED_PATTERNS.some((pattern) => pattern.test(cleanedName));
  if (isAlreadyPrefixed) return cleanedName;

  return `${teacherLabel} ${cleanedName}`;
}
