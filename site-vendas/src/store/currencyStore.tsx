import React, { createContext, useContext, useState, useEffect } from "react";

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

  // Auto-detecção por IP
  useEffect(() => {
    const detectLocale = async () => {
      // Se o usuário já tiver uma preferência salva, não sobrescrevemos
      if (localStorage.getItem("gorg-currency")) return;

      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        // Mapeamento de País -> Moeda
        if (data.country_code === 'BR') {
          setCurrency("BRL");
        } else if (['PT', 'ES', 'FR', 'DE', 'IT', 'NL', 'BE'].includes(data.country_code)) {
          setCurrency("EUR");
        } else {
          setCurrency("USD");
        }
      } catch (error) {
        console.error("Falha ao detectar localização:", error);
      }
    };

    detectLocale();
  }, []);

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
