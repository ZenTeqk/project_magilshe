import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/shared/field";
import { AccessSummary } from "../components/access-summary";
import { usePermissions, useRoles, useSaveRole, type Permission } from "../rbac-hooks";

const blank = { name: "", description: "", is_active: true, permission_codes: [] as string[] };

export default function RolesPage() {
  const roles = useRoles(), permissions = usePermissions(), save = useSaveRole();
  const [editor, setEditor] = useState<(typeof blank & { id?: number; is_super_admin?: boolean }) | null>(null);
  const grouped = useMemo(() => Object.entries((permissions.data ?? []).reduce<Record<string, Record<string, Permission[]>>>((modules, permission) => {
    ((modules[permission.module] ??= {})[permission.resource] ??= []).push(permission); return modules;
  }, {})), [permissions.data]);
  const submit = async () => { if (!editor) return; try { await save.mutateAsync(editor); toast.success(editor.id ? "Role updated" : "Role created"); setEditor(null); } catch (error: unknown) { const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data; toast.error(data ? Object.values(data).flat().join(" ") : "Unable to save role"); } };
  const toggleModule = (resources: Record<string, Permission[]>) => { if (!editor) return; const codes = Object.values(resources).flat().map((permission) => permission.code); const all = codes.every((code) => editor.permission_codes.includes(code)); setEditor({ ...editor, permission_codes: all ? editor.permission_codes.filter((code) => !codes.includes(code)) : [...new Set([...editor.permission_codes, ...codes])] }); };

  return <><PageHeader title="Roles & Access Profiles" description="Create reusable business profiles and choose exactly what each profile can do." actions={<Button onClick={() => setEditor({ ...blank })}>Create profile</Button>} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(roles.data ?? []).map((role) => <button key={role.id} onClick={() => setEditor({ ...role })} className="rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-colors hover:border-border-strong"><div className="flex items-center justify-between"><h2 className="font-semibold">{role.name}</h2><span className="text-xs text-muted-foreground">{role.users_count} users</span></div><p className="mt-2 min-h-10 text-sm text-muted-foreground">{role.description || "No description"}</p><div className="mt-3 flex items-center justify-between text-xs"><span>{role.is_super_admin ? "Full system access" : `${role.permission_codes.length} allowed actions`}</span><span>{role.is_active ? "Active" : "Inactive"}</span></div></button>)}</div>
    {editor && <div className="mt-5"><SectionCard title={editor.id ? `Edit ${editor.name}` : "Create access profile"} description="Permissions are grouped by business section and use the actions enforced by Django."><div className="grid gap-4 sm:grid-cols-2"><Field label="Profile name" required><Input disabled={editor.is_super_admin} value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></Field><label className="flex items-center justify-between rounded-xl border p-3 text-sm">Active <Switch disabled={editor.is_super_admin} checked={editor.is_active} onCheckedChange={(value) => setEditor({ ...editor, is_active: value })} /></label><Field label="Description" className="sm:col-span-2"><Textarea value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} /></Field></div>
      {editor.is_super_admin ? <div className="mt-5 rounded-xl border bg-muted/30 p-4"><p className="font-medium">Full system access</p><p className="mt-1 text-sm text-muted-foreground">This protected profile automatically receives every current and future registered permission.</p></div> : <div className="mt-5 space-y-4">{grouped.map(([module, resources]) => <div key={module} className="rounded-xl border border-border p-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold">{module}</h3><p className="text-xs text-muted-foreground">Choose the actions this profile may perform.</p></div><Button size="sm" variant="outline" onClick={() => toggleModule(resources)}>Select all</Button></div><div className="space-y-4">{Object.entries(resources).map(([resource, items]) => <div key={resource} className="grid gap-2 border-t pt-3 sm:grid-cols-[11rem_1fr]"><p className="text-sm font-medium">{resource}</p><div className="flex flex-wrap gap-2">{items.map((permission) => <label key={permission.code} className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm"><Checkbox checked={editor.permission_codes.includes(permission.code)} onCheckedChange={(value) => setEditor({ ...editor, permission_codes: value ? [...new Set([...editor.permission_codes, permission.code])] : editor.permission_codes.filter((code) => code !== permission.code) })} /><span className="capitalize">{permission.action.replaceAll("_", " ")}</span></label>)}</div></div>)}</div></div>)}</div>}
      {!editor.is_super_admin && <div className="mt-5"><h3 className="mb-3 font-semibold">Access summary</h3><AccessSummary permissions={permissions.data ?? []} selectedCodes={editor.permission_codes} /></div>}<div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button><Button disabled={save.isPending || editor.is_super_admin || !editor.name.trim()} onClick={submit}>Save profile</Button></div></SectionCard></div>}
  </>;
}
