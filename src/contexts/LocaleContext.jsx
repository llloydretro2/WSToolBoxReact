/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import zh from "../locales/zh.json";
import en from "../locales/en.json";

const dictionaries = { zh, en };

const LocaleContext = createContext(null);

const getValueFromPath = (dictionary, path) =>
  path.split(".").reduce((acc, key) => {
    if (acc && acc[key] !== undefined) {
      return acc[key];
    }
    return undefined;
  }, dictionary);

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(
    () => localStorage.getItem("locale") || "zh",
  );

  useEffect(() => {
    localStorage.setItem("locale", locale);
  }, [locale]);

  const dictionary = useMemo(
    () => dictionaries[locale] || dictionaries.zh,
    [locale],
  );

  const t = useCallback(
    (key, vars = {}) => {
      const value = getValueFromPath(dictionary, key);
      if (typeof value === "string") {
        return value.replace(/{{(\w+)}}/g, (match, varName) => {
          if (Object.prototype.hasOwnProperty.call(vars, varName)) {
            return String(vars[varName]);
          }
          return match;
        });
      }
      return value !== undefined ? value : key;
    },
    [dictionary],
  );

  const contextValue = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

LocaleProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
