import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

/* ---------------------------------------------------------------------- */
/* Inventory items — Admin/src/components/Item (Item.jsx + AddItem.jsx)    */
/* Backend: API-Server/items (items/products GET+POST, items/products/<pk> */
/* PUT, items/search GET). No dedicated delete endpoint — "delete" is a    */
/* soft delete via the is_deleted flag on update, same as old Admin.       */
/* ---------------------------------------------------------------------- */

const ITEMS_URL = endpoints.items.products;
const ITEM_SEARCH_URL = endpoints.items.search;
const TAX_CATEGORIES_URL = endpoints.tax.taxCategory;

// Fetched as a single large page since the backend list endpoint is always
// paginated (default page_size=5) and there is no "get all" route — mirrors
// how other catalog pages (tags, products) load the full list for the
// client-side DataTable's own search/sort/paginate.
const ITEMS_PAGE_SIZE = 1000;

export type InventoryCategory = { id: number; name: string };
export type InventoryTaxCategory = { id: number; tax_category: string; tax_percentage: number | string | null };

export type InventoryItem = {
  id: number;
  name: string | null;
  category: InventoryCategory | null;
  description: string | null;
  hsn_code: string | null;
  purchase_price: number | string | null;
  mrp_price: number | string | null;
  retail_price: number | string | null;
  wholesale_price: number | string | null;
  receiving_quantity: number | string | null;
  is_serialized: boolean;
  is_stock: boolean;
  is_deleted: boolean;
  tax_category: InventoryTaxCategory | null;
  created_at: string | null;
  updated_at: string | null;
};

export function useInventoryItems() {
  return useQuery({
    queryKey: ["catalog", "items"],
    queryFn: async () => {
      const { data } = await apiClient.get(ITEMS_URL, {
        params: { page: 1, page_size: ITEMS_PAGE_SIZE },
      });
      return (data?.results?.data ?? []) as InventoryItem[];
    },
  });
}

export function useInventoryTaxCategories() {
  return useQuery({
    queryKey: ["catalog", "tax-categories"],
    queryFn: async () => {
      const { data } = await apiClient.get(TAX_CATEGORIES_URL);
      return (data?.data ?? []) as InventoryTaxCategory[];
    },
  });
}

export function useInventoryCategories() {
  return useQuery({
    queryKey: ["catalog", "sub-categories"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.catalog.subCategories);
      return (data?.data ?? []) as InventoryCategory[];
    },
  });
}

export type SaveInventoryItemInput = {
  id?: number | undefined;
  name: string;
  category: number | "";
  description: string;
  hsn_code: string;
  purchase_price: number;
  mrp_price: number;
  retail_price: number;
  wholesale_price: number;
  receiving_quantity: number;
  is_serialized: boolean;
  is_stock: boolean;
  is_deleted: boolean;
  tax_category: number | "";
};

export function useSaveInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveInventoryItemInput) => {
      const { id, ...body } = payload;
      const { data } = id
        ? await apiClient.put(endpoints.items.product(id), body)
        : await apiClient.post(ITEMS_URL, body);
      return data as { message: string; data: InventoryItem };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "items"] }),
  });
}

// Old Admin has no hard-delete endpoint for items — "delete" toggles the
// is_deleted flag through the same PUT used for edits, which also removes
// the item from the (is_deleted=False filtered) list and search results.
export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: InventoryItem) => {
      const { data } = await apiClient.put(endpoints.items.product(item.id), { is_deleted: true });
      return data as { message: string; data: InventoryItem };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "items"] }),
  });
}

export function useInventoryItemSearch(name: string) {
  return useQuery({
    queryKey: ["catalog", "items", "search", name],
    queryFn: async () => {
      const { data } = await apiClient.get(ITEM_SEARCH_URL, { params: { name } });
      return (data?.data ?? []) as InventoryItem[];
    },
    enabled: name.trim().length > 0,
  });
}
