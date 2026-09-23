import { useMemo } from "react";
import { useCrmOptions } from "@/features/crm/hooks";

export const DEFAULT_SALE_UNITS = ["kg", "piece"] as const;
export type SaleUnit = string;

export function calculateLineItem(
  quantity: string | number,
  rate: string | number,
  gstPercentage: string | number = 0,
) {
  const parsedQuantity = Number(quantity);
  const parsedRate = Number(rate);
  const parsedGst = Number(gstPercentage);
  const baseAmount = Number.isFinite(parsedQuantity) && Number.isFinite(parsedRate)
    ? parsedQuantity * parsedRate
    : 0;
  const gstAmount = Number.isFinite(parsedGst) ? baseAmount * parsedGst / 100 : 0;
  return { baseAmount, gstAmount, totalAmount: baseAmount + gstAmount };
}

export function useSaleUnits() {
  const query = useCrmOptions("sale_unit");
  const units = useMemo(() => {
    const configured = (query.data ?? [])
      .map((name) => name.trim())
      .filter(Boolean);
    return configured.length
      ? [...new Map(configured.map((name) => [name.toLowerCase(), name])).values()]
      : [...DEFAULT_SALE_UNITS];
  }, [query.data]);
  return { ...query, units };
}

export function quantityStep(unit: SaleUnit) {
  return unit === "piece" ? "1" : unit === "kg" ? "0.5" : "0.001";
}

export function quantityMin(unit: SaleUnit) {
  return unit === "piece" ? 1 : unit === "kg" ? 0.5 : 0.001;
}

export function defaultQuantity(unit: SaleUnit) {
  return unit === "piece" ? 1 : unit === "kg" ? 0.5 : 1;
}

export function formatSaleQuantity(value: string | number, unit: SaleUnit = "kg") {
  const quantity = Number(value) || 0;
  return `${quantity} ${unit === "piece" && quantity !== 1 ? "pieces" : unit}`;
}
