import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

/** Endpoint paths sourced from the shared `@/lib/endpoints` registry. */
const paths = {
  configurationSave: endpoints.configuration.save,
  configurationSettings: endpoints.configuration.settings,
  termsAndConditions: endpoints.configuration.termsAndConditions,
  privacyPolicy: endpoints.configuration.privacyPolicy,
  myProfile: endpoints.customer.myProfile,
  updateProfile: endpoints.customer.updateProfile,
};

/* ---------------------------------------------------------------------- */
/* Configuration — Admin/src/components/config/Config.jsx                 */
/* configuration/get/ (GET) + configuration/save/ (POST, multipart)        */
/* ---------------------------------------------------------------------- */

export type ConfigurationData = {
  id: number;
  name: string | null;
  url: string | null;
  mobile: string | null;
  email: string | null;
  website: string | null;
  gst_number: string | null;
  food_license_number: string | null;
  company_address: string | null;
  map_iframe_link: string | null;
  description: string | null;
  return_policy: string | null;
  greeting_text: string | null;
  meta: Record<string, unknown> | null;
};

function unwrapConfiguration(data: unknown): ConfigurationData | null {
  const record = data as { data?: ConfigurationData } | undefined;
  return record?.data ?? null;
}

export function useConfiguration() {
  return useQuery({
    queryKey: ["settings", "configuration"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.configuration.get);
      return unwrapConfiguration(data);
    },
  });
}

export type SaveConfigurationInput = {
  id?: number;
  name: string;
  mobile: string;
  email: string;
  website: string;
  gst_number: string;
  food_license_number: string;
  company_address: string;
  map_iframe_link: string;
  description: string;
  return_policy: string;
  greeting_text: string;
  meta: Record<string, unknown>;
  image?: File | null;
};

function buildConfigurationForm(payload: SaveConfigurationInput): FormData {
  const form = new FormData();
  form.append("id", String(payload.id ?? 0));
  form.append("name", payload.name);
  form.append("company_address", payload.company_address);
  form.append("email", payload.email);
  form.append("website", payload.website);
  form.append("mobile", payload.mobile);
  form.append("gst_number", payload.gst_number);
  form.append("food_license_number", payload.food_license_number);
  form.append("map_iframe_link", payload.map_iframe_link);
  form.append("description", payload.description);
  form.append("return_policy", payload.return_policy);
  form.append("meta", JSON.stringify(payload.meta ?? {}));
  form.append("greeting_text", payload.greeting_text);
  if (payload.image) form.append("image", payload.image);
  return form;
}

export function useSaveConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveConfigurationInput) => {
      const { data } = await apiClient.post(paths.configurationSave, buildConfigurationForm(payload), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { message: string; data: ConfigurationData };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "configuration"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Settings — configuration/settings/ (ConfigurationSettings view).       */
/* No old Admin UI calls this; the view reads/writes the exact same       */
/* Configuration record and fields as configuration/get/+save/ above.     */
/* ---------------------------------------------------------------------- */

export function useConfigurationSettings() {
  return useQuery({
    queryKey: ["settings", "configuration-settings"],
    queryFn: async () => {
      const { data } = await apiClient.get(paths.configurationSettings);
      return unwrapConfiguration(data);
    },
  });
}

export type SaveConfigurationSettingsInput = SaveConfigurationInput;

export function useSaveConfigurationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveConfigurationSettingsInput) => {
      const { data } = await apiClient.post(paths.configurationSettings, buildConfigurationForm(payload), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { message: string; data: ConfigurationData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "configuration-settings"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "configuration"] });
    },
  });
}

/* ---------------------------------------------------------------------- */
/* Terms & Conditions — Admin/src/components/Terms&condtions/EditTerms.jsx */
/* configuration/terms-and-conditions/ (GET + PUT { content })             */
/* ---------------------------------------------------------------------- */

export function useTermsAndConditions() {
  return useQuery({
    queryKey: ["settings", "terms-and-conditions"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<{ content: string }>(paths.termsAndConditions);
        return data?.content ?? "";
      } catch {
        return "";
      }
    },
  });
}

export function useSaveTermsAndConditions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await apiClient.put<{ content: string }>(paths.termsAndConditions, { content });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "terms-and-conditions"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Privacy Policy — Admin/src/components/Terms&condtions/EditPolicy.jsx    */
/* configuration/privacy-policy/ (GET + PUT { content })                   */
/* ---------------------------------------------------------------------- */

export function usePrivacyPolicy() {
  return useQuery({
    queryKey: ["settings", "privacy-policy"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<{ content: string }>(paths.privacyPolicy);
        return data?.content ?? "";
      } catch {
        return "";
      }
    },
  });
}

export function useSavePrivacyPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await apiClient.put<{ content: string }>(paths.privacyPolicy, { content });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "privacy-policy"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Profile — customer/get-my-profile/ (GET) + customer/update-profile/     */
/* (POST, multipart). Both views operate on `request.user`/the id of the   */
/* record the caller supplies, and AUTH_USER_MODEL is customer.Customer, so */
/* a logged-in Admin/staff account is itself a Customer row and these      */
/* genuinely return/update that account's own record — see                 */
/* API-Server/customer/views.py GetMyProfile (reads request.user.id) and   */
/* UpdateProfile (updates the id posted by the client; we always post the  */
/* caller's own id from get-my-profile, so it only ever touches the        */
/* signed-in account). The update view only accepts `name` and an optional */
/* `image` — email/phone are not writable through this endpoint.           */
/* ---------------------------------------------------------------------- */

export type MyProfile = {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  first_name: string;
  last_name: string;
  profile_url: string | null;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
};

function unwrapProfile(data: unknown): MyProfile | null {
  const record = data as { data?: MyProfile } | undefined;
  const profile = record?.data;
  // GetMyProfile returns `{data: {}}` if the lookup fails internally.
  if (!profile || typeof profile.id !== "number") return null;
  return profile;
}

export function useMyProfile() {
  return useQuery({
    queryKey: ["settings", "my-profile"],
    queryFn: async () => {
      const { data } = await apiClient.get(paths.myProfile);
      return unwrapProfile(data);
    },
  });
}

export type UpdateProfileInput = {
  first_name: string;
  last_name: string;
  phone: string;
  image?: File | null;
};

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateProfileInput) => {
      const form = new FormData();
      form.append("first_name", payload.first_name);
      form.append("last_name", payload.last_name);
      form.append("phone", payload.phone);
      if (payload.image) form.append("image", payload.image);
      const { data } = await apiClient.post(paths.updateProfile, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { message: string; data: MyProfile };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "my-profile"] }),
  });
}
