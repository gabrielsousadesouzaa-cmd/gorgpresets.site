import React, { createContext, useContext, useState } from "react";

type Currency = "BRL" | "USD" | "EUR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatCurrency: (valueInBrl: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Taxas de câmbio estimadas base para converter do BRL mockado
const exchangeRates = {
  BRL: 1,
  USD: 0.20,
  EUR: 0.18,
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem("gorg-currency");
    return (saved as Currency) || "BRL";
  });

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("gorg-currency", c);
  };

  const formatCurrency = (valueInBrl: number) => {
    const converted = valueInBrl * (exchangeRates[currency] || 1);
    let locale = "pt-BR";
    if (currency === "USD") locale = "en-US";
    if (currency === "EUR") locale = "pt-PT";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(converted);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
  return context;
}
