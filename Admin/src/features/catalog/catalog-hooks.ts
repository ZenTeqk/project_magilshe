import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

function unwrap<T>(data: unknown): T[] {
  const record = data as { data?: T[] } | undefined;
  return record?.data ?? [];
}

/* ---------------------------------------------------------------------- */
/* Tags — Admin/src/components/master/Tags (tag/tags, GET + POST-upsert)   */
/* ---------------------------------------------------------------------- */

export type CatalogTag = { id: number; tag: string };

export function useCatalogTags() {
  return useQuery({
    queryKey: ["catalog", "tags"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.catalog.tags);
      return unwrap<CatalogTag>(data);
    },
  });
}

export function useSaveCatalogTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: number | undefined; tag: string }) => {
      const { data } = await apiClient.post(endpoints.catalog.tags, payload);
      return data as { message: string; data: CatalogTag };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "tags"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Units — Admin/src/components/master/Unit (unit/item, GET + POST-upsert) */
/* ---------------------------------------------------------------------- */

export type CatalogUnit = { id: number; name: string; description: string | null; is_variant?: boolean };

export function useCatalogUnits() {
  return useQuery({
    queryKey: ["catalog", "units"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.catalog.units);
      return unwrap<CatalogUnit>(data);
    },
  });
}

export function useSaveCatalogUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: number | undefined; name: string; description: string }) => {
      const { data } = await apiClient.post(endpoints.catalog.units, payload);
      return data as { message: string; data: CatalogUnit };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "units"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Sub-units — Admin/src/components/master/KG (kg/sub-unit, GET/POST/PUT)  */
/* ---------------------------------------------------------------------- */

export type CatalogSubUnit = {
  id: number;
  kg: string;
  description: string | null;
  unit: { id: number; name: string } | null;
};

export function useCatalogSubUnits() {
  return useQuery({
    queryKey: ["catalog", "sub-units"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.catalog.subUnits);
      return unwrap<CatalogSubUnit>(data);
    },
  });
}

export function useSaveCatalogSubUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: number | undefined; kg: string; description: string; unit: number }) => {
      const { id, ...body } = payload;
      const { data } = id
        ? await apiClient.put(endpoints.catalog.subUnit(id), body)
        : await apiClient.post(endpoints.catalog.subUnits, body);
      return data as { data: CatalogSubUnit };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "sub-units"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Main categories — Admin/src/components/master/Category (multipart)     */
/* ---------------------------------------------------------------------- */

export type CatalogCategory = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  slug: string | null;
  content: string | null;
};

export function useCatalogCategories() {
  return useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.catalog.mainCategories);
      return unwrap<CatalogCategory>(data);
    },
  });
}

export type SaveCategoryInput = {
  id?: number;
  name: string;
  description: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  content: string;
  image?: File | null;
};

export function useSaveCatalogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveCategoryInput) => {
      const form = new FormData();
      if (payload.id) form.append("id", String(payload.id));
      form.append("name", payload.name);
      form.append("description", payload.description);
      form.append("meta_title", payload.meta_title);
      form.append("meta_description", payload.meta_description);
      form.append("slug", payload.slug);
      form.append("content", payload.content);
      if (payload.image) form.append("image", payload.image);
      const { data } = await apiClient.post(endpoints.catalog.mainCategories, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { message: string; data: CatalogCategory };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "categories"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Sub-categories — Admin/src/components/master/SubCategories (multipart) */
/* ---------------------------------------------------------------------- */

export type CatalogSubCategory = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  slug: string | null;
  content: string | null;
  main_category: { id: number; name: string } | null;
};

export function useCatalogSubCategories() {
  return useQuery({
    queryKey: ["catalog", "sub-categories"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.catalog.subCategories);
      return unwrap<CatalogSubCategory>(data);
    },
  });
}

export type SaveSubCategoryInput = SaveCategoryInput & { main_category: number };

/* ---------------------------------------------------------------------- */
/* Gallery — Admin/src/components/master/Gallery (multi-upload, delete)   */
/* ---------------------------------------------------------------------- */

export type CatalogGalleryImage = { id: number; image_url: string };

export function useCatalogGallery() {
  return useQuery({
    queryKey: ["catalog", "gallery"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.catalog.gallery);
      return unwrap<CatalogGalleryImage>(data);
    },
  });
}

export function useAddGalleryImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const form = new FormData();
      files.forEach((file) => form.append("images", file));
      const { data } = await apiClient.post(endpoints.catalog.galleryAdd, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { message: string; data: CatalogGalleryImage[] };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "gallery"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Products (Cake) — Admin/src/components/master/Cake                     */
/* ---------------------------------------------------------------------- */

export type CakePriceRow = { id: number; kg_id: number; kg: string; price: string | number };
export type CakeImage = { id: number; url: string };

export type CatalogCake = {
  id: number;
  name: string;
  description: string | null;
  seo_text: string | null;
  seo_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  slug: string | null;
  content: string | null;
  tag: string[];
  tag_details: Array<{ id: number; tag: string }>;
  sub_category: { id: number; name: string } | null;
  main_category: { id: number; name: string } | null;
  unit: { id: number; name: string; is_variant: boolean } | null;
  price_list: CakePriceRow[];
  images: CakeImage[];
};

export function useCatalogCakes() {
  return useQuery({
    queryKey: ["catalog", "cakes"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.catalog.cakes);
      return unwrap<CatalogCake>(data);
    },
  });
}

export type CakeKgListItem = { id: number; kg_id: number; kg_name: string; kg_price: string | number; is_deleted: boolean };
export type CakeImageItem = { id: number; image: File | null; is_deleted: boolean; url?: string };

export type SaveCakeInput = {
  id?: number | undefined;
  name: string;
  description: string;
  seo_text: string;
  seo_url: string;
  sub_category: number;
  unit: number;
  tag: string[];
  meta_title: string;
  meta_description: string;
  slug: string;
  content: string;
  kg_list: CakeKgListItem[];
  images: CakeImageItem[];
};

export function useSaveCatalogCake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveCakeInput) => {
      const form = new FormData();
      if (payload.id) form.append("id", String(payload.id));
      form.append("name", payload.name);
      form.append("description", payload.description);
      form.append("seo_text", payload.seo_text);
      form.append("seo_url", payload.seo_url);
      form.append("sub_category", String(payload.sub_category));
      form.append("unit", String(payload.unit));
      form.append("tag", payload.tag.join(","));
      form.append("meta_title", payload.meta_title);
      form.append("meta_description", payload.meta_description);
      form.append("slug", payload.slug);
      form.append("content", payload.content);
      payload.kg_list.forEach((item) => form.append("kg_list[]", JSON.stringify(item)));
      payload.images.forEach((image, index) => {
        form.append("image_data[]", JSON.stringify({ id: image.id, index, is_deleted: image.is_deleted }));
        if (image.image) form.append("image_list[]", image.image);
      });
      const { data } = await apiClient.post(endpoints.catalog.cakeCreate, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { message: string; data: CatalogCake };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "cakes"] }),
  });
}

export function useDeleteCatalogCake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.delete(endpoints.catalog.cakeDelete(id));
      return data as { message: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "cakes"] }),
  });
}

export function useDeleteGalleryImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.delete(endpoints.catalog.galleryDelete(id));
      return data as { message: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "gallery"] }),
  });
}

export function useSaveCatalogSubCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveSubCategoryInput) => {
      const form = new FormData();
      if (payload.id) form.append("id", String(payload.id));
      form.append("name", payload.name);
      form.append("description", payload.description);
      form.append("main_category", String(payload.main_category));
      form.append("meta_title", payload.meta_title);
      form.append("meta_description", payload.meta_description);
      form.append("slug", payload.slug);
      form.append("content", payload.content);
      if (payload.image) form.append("image", payload.image);
      const { data } = await apiClient.post(endpoints.catalog.subCategories, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { message: string; data: CatalogSubCategory };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "sub-categories"] }),
  });
}
