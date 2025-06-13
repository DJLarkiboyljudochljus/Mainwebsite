import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    lng: "en",
    supportedLngs: ["en", "sv", "fr", "de"],
    backend: {
      loadPath: "/api/i18n/{{lng}}",
    },
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    react: {
      useSuspense: true, // Enable suspense for i18next
    },
  });

export default i18n;
