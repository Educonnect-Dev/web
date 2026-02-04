import { useEffect, useState } from "react";
import i18n from "../../i18n";

export type Language = "fr" | "ar";

const STORAGE_KEY = "educonnect_language";

function getStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return "fr";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "ar" ? "ar" : "fr";
}

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    }
    if (i18n.language !== language) {
      i18n.changeLanguage(language).catch(() => undefined);
    }
  }, [language]);

  return { language, setLanguage };
}
