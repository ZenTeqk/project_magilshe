import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
export type Role = { id:number; name:string; description:string; is_active:boolean; is_super_admin:boolean; permission_codes:string[]; users_count:number; created_on:string; updated_on:string };
export type Permission = { id:number; code:string; module:string; resource:string; action:string; name:string };
export type StaffUser = { id:number; username:string; first_name:string; last_name:string; email:string; phone:string; role:number; role_name:string|null; is_active:boolean; is_staff:boolean; date_joined:string; last_login:string|null; permissions:string[] };
const list=<T,>(d:T[]|{results?:T[]})=>Array.isArray(d)?d:d.results??[];
export const useRbacUsers=(params?:{archived?:boolean})=>useQuery({queryKey:["rbac","users",params],queryFn:async()=>list((await apiClient.get(endpoints.rbac.users,{params})).data as StaffUser[]|{results?:StaffUser[]})});
export const useRoles=()=>useQuery({queryKey:["rbac","roles"],queryFn:async()=>list((await apiClient.get(endpoints.rbac.roles)).data as Role[]|{results?:Role[]})});
export const usePermissions=()=>useQuery({queryKey:["rbac","permissions"],queryFn:async()=>list((await apiClient.get(endpoints.rbac.permissions)).data as Permission[]|{results?:Permission[]})});
export function useSaveUser(){const q=useQueryClient();return useMutation({mutationFn:async({id,...body}:Partial<StaffUser>&{id?:number;password?:string})=>{if(body.password==="")delete body.password;return (id?await apiClient.patch(endpoints.rbac.user(id),body):await apiClient.post(endpoints.rbac.users,body)).data as StaffUser;},onSuccess:()=>{q.invalidateQueries({queryKey:["rbac","users"]});q.invalidateQueries({queryKey:["rbac","me"]});}});}
export function useArchiveUser(){const q=useQueryClient();return useMutation({mutationFn:async(id:number)=>{await apiClient.delete(endpoints.rbac.user(id));return id;},onSuccess:()=>{q.invalidateQueries({queryKey:["rbac","users"]});q.invalidateQueries({queryKey:["archived-records","users"]});q.invalidateQueries({queryKey:["rbac","me"]});}});}
export function useSaveRole(){const q=useQueryClient();return useMutation({mutationFn:async({id,...body}:Partial<Role>&{id?:number})=>(id?await apiClient.patch(endpoints.rbac.role(id),body):await apiClient.post(endpoints.rbac.roles,body)).data as Role,onSuccess:()=>{q.invalidateQueries({queryKey:["rbac","roles"]});q.invalidateQueries({queryKey:["rbac","me"]});}});}
