const NON_FIELD_KEYS = ["detail", "message", "non_field_errors"];

export function extractFieldErrors(error) {
  const data = error?.response?.data;
  if (!data || typeof data !== "object") return {};
  const fieldErrors = {};
  Object.entries(data).forEach(([key, value]) => {
    if (NON_FIELD_KEYS.includes(key)) return;
    fieldErrors[key] = Array.isArray(value) ? value.join(" ") : String(value);
  });
  return fieldErrors;
}

export function extractErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.message) return data.message;
  if (data.detail) return data.detail;
  if (data.non_field_errors) {
    return Array.isArray(data.non_field_errors) ? data.non_field_errors.join(" ") : String(data.non_field_errors);
  }
  const fieldErrors = extractFieldErrors(error);
  const firstField = Object.keys(fieldErrors)[0];
  if (firstField) return `${firstField.replaceAll("_", " ")}: ${fieldErrors[firstField]}`;
  return fallback;
}

export function focusFirstInvalidField(fieldErrors, formSelector) {
  const firstKey = Object.keys(fieldErrors || {})[0];
  if (!firstKey) return;
  requestAnimationFrame(() => {
    const scope = formSelector ? document.querySelector(formSelector) : document;
    const field = scope?.querySelector(`[name="${firstKey}"]`);
    if (!field) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    field.focus?.();
  });
}
