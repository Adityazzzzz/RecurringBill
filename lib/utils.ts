import dayjs from "dayjs";
import { useSubscriptionStore } from "./subscriptionStore";

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.50,
};

export const formatCurrency = (value: number, fromCurrency = "USD", toCurrency?: string): string => {
  const targetCurrency = toCurrency || useSubscriptionStore.getState().baseCurrency || "USD";
  
  const rateFrom = EXCHANGE_RATES[fromCurrency.toUpperCase()] || 1.0;
  const rateTo = EXCHANGE_RATES[targetCurrency.toUpperCase()] || 1.0;
  const convertedValue = (value / rateFrom) * rateTo;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: targetCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedValue);
  } catch {
    return `${targetCurrency} ${convertedValue.toFixed(2)}`;
  }
};

export const formatSubscriptionDateTime = (value?: string): string => {
  if (!value) return "Not provided";
  const parsedDate = dayjs(value);
  return parsedDate.isValid() ? parsedDate.format("MM/DD/YYYY") : "Not provided";
};

export const formatStatusLabel = (value?: string): string => {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
};