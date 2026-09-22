export function configuredOptions(options: string[] | undefined) {
  return dedupeOptions(options ?? []);
}

export function optionsWithCurrent(options: string[] | undefined, current: string | null | undefined) {
  return dedupeOptions([...(options ?? []), current ?? ""]);
}

export function optionsWithCurrentValues(options: string[] | undefined, current: Array<string | number | null | undefined>) {
  return dedupeOptions([...(options ?? []), ...current.map((value) => String(value ?? ""))]);
}

function dedupeOptions(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
