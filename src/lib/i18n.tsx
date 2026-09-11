import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import messages from "./translations.json";

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "pl", name: "Polski" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
] as const;
export type Language = (typeof LANGUAGES)[number]["code"];
const STORAGE_KEY = "scratchlas.language";
export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some(({ code }) => code === value);
}
export function translate(
  language: Language,
  key: string,
  values: Record<string, string | number | undefined> = {},
) {
  const entry = (messages as Record<string, Record<Language, string>>)[key];
  return (entry?.[language] ?? key).replace(/\{(\d+)\}/g, (token, name: string) =>
    values[name] === undefined ? token : String(values[name]),
  );
}
const I18nContext = createContext({
  language: "en" as Language,
  setLanguage: (_language: Language) => {},
  tr: (key: string, values?: Record<string, string | number | undefined>) =>
    translate("en", key, values),
});
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLanguage(saved)) updateLanguage(saved);
    } catch {
      /* Language selection also works when storage is unavailable. */
    }
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY)
        updateLanguage(isLanguage(event.newValue) ? event.newValue : "en");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  function setLanguage(next: Language) {
    updateLanguage(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Keep the in-memory preference. */
    }
  }
  return (
    <I18nContext.Provider
      value={{ language, setLanguage, tr: (key, values) => translate(language, key, values) }}
    >
      {children}
    </I18nContext.Provider>
  );
}
export function useI18n() {
  return useContext(I18nContext);
}
export function TranslatedText({ text }: { text: string }) {
  const { tr } = useI18n();
  return <>{tr(text)}</>;
}
