import React, { createContext, useContext, useState, useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type Currency = "BRL" | "USD" | "EUR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatCurrency: (valueInBrl: number, manualPrices?: { priceUSD?: number | null; priceEUR?: number | null }) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Taxas de câmbio estimadas base para converter do BRL mockado
const exchangeRates = {
  BRL: 1,
  USD: 0.20,
  EUR: 0.18,
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useSiteSettings();
  const defaultCurrency = settings?.integration?.defaultCurrency || "BRL";

  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem("gorg-currency");
    return (saved as Currency) || "BRL";
  });

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("gorg-currency", c);
  };

  // Sync with defaultCurrency from settings
  useEffect(() => {
    const saved = localStorage.getItem("gorg-currency");
    if (!saved && !loading && defaultCurrency) {
      setCurrencyState(defaultCurrency);
    }
  }, [loading, defaultCurrency]);

  // Auto-detecção por IP
  useEffect(() => {
    const detectLocale = async () => {
      // Se o usuário já tiver uma preferência salva, não sobrescrevemos
      if (localStorage.getItem("gorg-currency")) return;

      // Se a moeda padrão das configurações já foi carregada e for diferente de BRL, não rodamos IP detection para respeitar a moeda oficial definida pelo Admin
      if (!loading && defaultCurrency && defaultCurrency !== "BRL") {
        return;
      }

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
  }, [loading, defaultCurrency]);

  const formatCurrency = (valueInBrl: number, manualPrices?: { priceUSD?: number | null; priceEUR?: number | null }) => {
    let converted = valueInBrl * (exchangeRates[currency] || 1);
    if (currency === "USD" && manualPrices?.priceUSD) converted = manualPrices.priceUSD;
    if (currency === "EUR" && manualPrices?.priceEUR) converted = manualPrices.priceEUR;
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
