import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

const LanguageSwitcher = () => {
  const { t } = useTranslation();
  const [languages, setLanguages] = useState([]);
  const [loadingLang, setLoadingLang] = useState(false);

  useEffect(() => {
    fetch("/api/i18n/languages")
      .then((res) => res.json())
      .then(setLanguages)
      .catch((err) => console.error("Failed to load languages:", err));
  }, []);

  const changeLanguage = (lng) => {
    setLoadingLang(true);
    document.body.style.overflow = "hidden";

    i18n.changeLanguage(lng).then(() => {
      setLoadingLang(false);
      document.body.style.overflow = "auto";
    });
  };

  return (
    <>
      <select
        onChange={(e) => changeLanguage(e.target.value)}
        value={i18n.language}
        className="language-switcher"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>

      {loadingLang && (
        <div className="overlay">
          <div className="spinner" />
        </div>
      )}
    </>
  );
};

export default LanguageSwitcher;
