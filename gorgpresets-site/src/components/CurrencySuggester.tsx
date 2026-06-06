import { useEffect, useRef } from "react";
import { useLanguage } from "@/store/languageStore";
import { useCurrency } from "@/store/currencyStore";
import { toast } from "sonner";

export function CurrencySuggester() {
  const { language } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const prevLanguageRef = useRef(language);

  useEffect(() => {
    // Only suggest if the language actually changed
    if (prevLanguageRef.current !== language) {
      prevLanguageRef.current = language;

      let suggestedCurrency: "BRL" | "USD" | "EUR" | null = null;
      let currencyLabel = "";

      if (language === "PT") {
        if (currency !== "BRL") {
          suggestedCurrency = "BRL";
          currencyLabel = "Real (BRL R$)";
        }
      } else if (language === "EN") {
        if (currency !== "USD") {
          suggestedCurrency = "USD";
          currencyLabel = "Dollar (USD $)";
        }
      } else if (language === "ES") {
        if (currency !== "EUR") {
          suggestedCurrency = "EUR";
          currencyLabel = "Euro (EUR €)";
        }
      }

      if (suggestedCurrency) {
        toast.info(
          language === "PT" ? "Sugestão de Moeda" : (language === "ES" ? "Sugerencia de Moneda" : "Currency Suggestion"),
          {
            id: "currency-suggestion",
            description: language === "PT" 
              ? `Notei que você mudou para Português. Deseja mudar a moeda para ${currencyLabel}?` 
              : (language === "ES" 
                ? `He notado que cambiaste a Español. ¿Deseas cambiar la moneda a ${currencyLabel}?` 
                : `I noticed you changed to English. Would you like to change the currency to ${currencyLabel}?`),
            action: {
              label: language === "PT" ? "Mudar" : (language === "ES" ? "Cambiar" : "Change"),
              onClick: () => {
                setCurrency(suggestedCurrency as any);
                toast.dismiss("currency-suggestion");
              },
            },
            duration: 8000,
          }
        );
      }
    }
  }, [language, currency, setCurrency]);

  return null;
}
