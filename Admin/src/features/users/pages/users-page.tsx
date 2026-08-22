import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StatusChip } from "@/components/shared/status-chip";
import { AccessSummary } from "../components/access-summary";
import { usePermissions, useRbacUsers, useRoles, useSaveUser } from "../rbac-hooks";

const empty = { username: "", first_name: "", last_name: "", email: "", phone: "", role: 0, role_name: null as string | null, is_active: true, password: "", permissions: [] as string[] };

export default function UsersPage() {
  const users = useRbacUsers(), roles = useRoles(), permissions = usePermissions(), save = useSaveUser();
  const [editor, setEditor] = useState<(typeof empty & { id?: number }) | null>(null);
  const selectedRole = (roles.data ?? []).find((role) => role.id === editor?.role);
  const previewCodes = selectedRole?.is_super_admin ? (permissions.data ?? []).map((permission) => permission.code) : selectedRole?.permission_codes ?? [];
  const submit = async () => { if (!editor) return; try { await save.mutateAsync(editor); toast.success(editor.id ? "User updated" : "User created"); setEditor(null); } catch (error: unknown) { const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data; toast.error(data ? Object.values(data).flat().join(" ") : "Unable to save user"); } };

  return <><PageHeader title="Users" description="Create staff profiles, assign business roles and review access before saving." actions={<Button onClick={() => setEditor({ ...empty })}>Create new user</Button>} />
    <DataTable rows={users.data ?? []} rowKey={(user) => String(user.id)} searchKeys={(user) => `${user.username} ${user.first_name} ${user.last_name} ${user.email} ${user.phone} ${user.role_name}`} onRowClick={(user) => setEditor({ ...empty, ...user, password: "" })} columns={[
      { key: "user", header: "User", cell: (user) => <span><span className="block font-medium">{user.first_name} {user.last_name}</span><span className="text-xs text-muted-foreground">{user.username}</span></span> },
      { key: "contact", header: "Contact", cell: (user) => user.email || user.phone },
      { key: "role", header: "Profile", cell: (user) => user.role_name || "Unassigned" },
      { key: "access", header: "Access", cell: (user) => <span className="text-sm">{user.permissions.length} allowed actions</span> },
      { key: "status", header: "Status", cell: (user) => <StatusChip status={user.is_active ? "Active" : "Inactive"} /> },
    ]} />
    <Dialog open={!!editor} onOpenChange={(open) => !open && setEditor(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{editor?.id ? "Edit user" : "Create new user"}</DialogTitle></DialogHeader>{editor && <div className="space-y-5">
      <section><h3 className="mb-3 text-sm font-semibold">1. Basic information</h3><div className="grid gap-4 sm:grid-cols-2"><Field label="First name"><Input value={editor.first_name} onChange={(event) => setEditor({ ...editor, first_name: event.target.value })} /></Field><Field label="Last name"><Input value={editor.last_name} onChange={(event) => setEditor({ ...editor, last_name: event.target.value })} /></Field><Field label="Email" required><Input type="email" value={editor.email} onChange={(event) => setEditor({ ...editor, email: event.target.value })} /></Field><Field label="Mobile" required><Input value={editor.phone} maxLength={10} onChange={(event) => setEditor({ ...editor, phone: event.target.value.replace(/\D/g, "") })} /></Field><Field label="Username" required><Input value={editor.username} onChange={(event) => setEditor({ ...editor, username: event.target.value })} /></Field><Field label={editor.id ? "New password (optional)" : "Temporary password"} required={!editor.id}><Input type="password" value={editor.password} onChange={(event) => setEditor({ ...editor, password: event.target.value })} /></Field><label className="flex items-center justify-between rounded-xl border p-3 text-sm sm:col-span-2">Account active <Switch checked={editor.is_active} onCheckedChange={(value) => setEditor({ ...editor, is_active: value })} /></label></div></section>
      <section><h3 className="mb-3 text-sm font-semibold">2. Assign access profile</h3><Field label="Role / Profile" required><Select value={editor.role ? String(editor.role) : ""} onValueChange={(value) => setEditor({ ...editor, role: Number(value), role_name: (roles.data ?? []).find((role) => role.id === Number(value))?.name ?? null })}><SelectTrigger><SelectValue placeholder="Select a business profile" /></SelectTrigger><SelectContent>{(roles.data ?? []).filter((role) => role.is_active).map((role) => <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>)}</SelectContent></Select></Field>{selectedRole?.description && <p className="mt-2 text-sm text-muted-foreground">{selectedRole.description}</p>}</section>
      <section className="rounded-xl border bg-muted/20 p-4"><div className="mb-3"><h3 className="text-sm font-semibold">3. What can this user access?</h3><p className="text-xs text-muted-foreground">Read-only preview inherited from {selectedRole?.name ?? "the selected profile"}.</p></div>{selectedRole ? <AccessSummary permissions={permissions.data ?? []} selectedCodes={previewCodes} /> : <p className="text-sm text-muted-foreground">Select a profile to preview access.</p>}</section>
    </div>}<DialogFooter><Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button><Button disabled={save.isPending || !editor?.username || !editor.email || !editor.phone || !editor.role || (!editor.id && !editor.password)} onClick={submit}>{editor?.id ? "Save changes" : "Create user"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
