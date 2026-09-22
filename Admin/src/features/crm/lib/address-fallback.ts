export const ADDRESS_NOT_PROVIDED = "Address not provided";

export function addressOrFallback(...values: Array<string | null | undefined>) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) ?? ADDRESS_NOT_PROVIDED;
}
