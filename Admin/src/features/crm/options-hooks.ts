import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

export type CrmOptionRow = {
  id: string | number;
  option_type: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record["results"])) return record["results"] as T[];
    if (Array.isArray(record["data"])) return record["data"] as T[];
  }
  return [];
}

export function useCrmOptionRows(type: string) {
  return useQuery({
    queryKey: ["crm", "option-rows", type],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.options, { params: { type } });
      return unwrapList<CrmOptionRow>(data);
    },
  });
}

export type SaveOptionInput = {
  id?: string | number | undefined;
  option_type: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export function useSaveCrmOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: SaveOptionInput) => {
      const { data } = id
        ? await apiClient.patch<CrmOptionRow>(endpoints.crm.option(id), payload)
        : await apiClient.post<CrmOptionRow>(endpoints.crm.options, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "option-rows"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "options", data.option_type] });
    },
  });
}

export function useToggleCrmOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string | number; is_active: boolean }) => {
      const { data } = await apiClient.patch<CrmOptionRow>(endpoints.crm.option(id), { is_active });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "option-rows"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "options", data.option_type] });
    },
  });
}

export function useDeleteCrmOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string | number; optionType: string }) => {
      await apiClient.delete(endpoints.crm.option(id));
    },
    onSuccess: (_data, { optionType }) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "option-rows"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "options", optionType] });
    },
  });
}
