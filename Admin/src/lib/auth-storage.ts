/**
 * Token storage, kept bit-compatible with the existing Admin/ app
 * (same localStorage key/shape) so both apps can read the same session
 * during the transition period.
 */
const TOKEN_KEY = "cakeryToken";

export type Tokens = { access: string; refresh: string };

export function getTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Tokens;
  } catch {
    return null;
  }
}

export function setTokens(tokens: Tokens) {
  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function updateAccessToken(access: string) {
  const current = getTokens();
  setTokens({ access, refresh: current?.refresh ?? "" });
}

export function clearTokens() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getTokens()?.access;
}
