import { useMemo } from "react";
import { useCrmOptionRows } from "@/features/crm/options-hooks";

export const DEFAULT_SALE_UNITS = ["kg", "piece"] as const;
export type SaleUnit = string;

export function useSaleUnits() {
  const query = useCrmOptionRows("sale_unit");
  const units = useMemo(() => {
    const configured = (query.data ?? []).filter((row) => row.is_active).map((row) => row.name);
    return [...new Set([...DEFAULT_SALE_UNITS, ...configured])];
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
