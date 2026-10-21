/** Payment-method choice for confirming an order without an advance. Matches
 * NO_ADVANCE_METHOD in API-Server/crm/views.py: the server records no payment. */
export const NO_ADVANCE_METHOD = "No Advance";

export const isNoAdvance = (method: string | null | undefined) =>
  (method ?? "").trim().toLowerCase() === NO_ADVANCE_METHOD.toLowerCase();
