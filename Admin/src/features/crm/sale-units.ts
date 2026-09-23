import { useMemo } from "react";
import { useCrmOptions } from "@/features/crm/hooks";
import { useCrmOptionRows } from "@/features/crm/options-hooks";

export const DEFAULT_SALE_UNITS = ["kg", "piece"] as const;
export type SaleUnit = string;
/** Lowercased unit name -> conversion factor to the pricing base unit (kg for weight units, 1 for count units). */
export type UnitFactors = Record<string, number>;

/** Unit names treated as grams when no CRM Settings conversion factor is configured for them. */
const GRAM_ALIASES = new Set(["g", "gm", "gms", "gram", "grams"]);

export function calculateLineItem(
  quantity: string | number,
  rate: string | number,
  gstPercentage: string | number = 0,
  unitType: SaleUnit = "kg",
  factors: UnitFactors = {},
) {
  const parsedQuantity = pricingQuantity(quantity, unitType, factors);
  const parsedRate = Number(rate);
  const parsedGst = Number(gstPercentage);
  const baseAmount = Number.isFinite(parsedQuantity) && Number.isFinite(parsedRate)
    ? parsedQuantity * parsedRate
    : 0;
  const gstAmount = Number.isFinite(parsedGst) ? baseAmount * parsedGst / 100 : 0;
  return { baseAmount, gstAmount, totalAmount: baseAmount + gstAmount };
}

/**
 * Converts a quantity into the unit the rate is priced against, using the
 * conversion factor configured in CRM Settings for the unit when one exists.
 * Falls back to the historical gram-name heuristic (kg/piece/unconfigured
 * units pass through 1:1) so existing data keeps computing the same amounts.
 */
export function pricingQuantity(quantity: string | number, unitType: SaleUnit = "kg", factors: UnitFactors = {}) {
  const parsedQuantity = Number(quantity);
  if (!Number.isFinite(parsedQuantity)) return 0;
  const normalized = String(unitType || "").trim().toLowerCase();
  const configuredFactor = factors[normalized];
  if (Number.isFinite(configuredFactor)) return parsedQuantity * (configuredFactor as number);
  if (GRAM_ALIASES.has(normalized)) return parsedQuantity / 1000;
  return parsedQuantity;
}

export function useSaleUnits() {
  const query = useCrmOptions("sale_unit");
  const rows = useCrmOptionRows("sale_unit");
  const units = useMemo(() => {
    const configured = (query.data ?? [])
      .map((name) => name.trim())
      .filter(Boolean);
    return configured.length
      ? [...new Map(configured.map((name) => [name.toLowerCase(), name])).values()]
      : [...DEFAULT_SALE_UNITS];
  }, [query.data]);
  const factors = useMemo(() => {
    const map: UnitFactors = {};
    for (const row of rows.data ?? []) {
      const factor = Number(row.conversion_factor);
      if (row.name && Number.isFinite(factor)) map[row.name.trim().toLowerCase()] = factor;
    }
    return map;
  }, [rows.data]);
  return { ...query, units, factors };
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
