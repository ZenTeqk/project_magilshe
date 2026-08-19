import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Field } from "@/components/shared/field";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccessSummary } from "@/features/users/components/access-summary";
import { useMyProfile, useUpdateProfile } from "@/features/settings/settings-hooks";
import { useCurrentAccess } from "@/features/auth/rbac";

const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString("en-IN") : "Not available";
const initials = (first: string, last: string, username: string) => `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || username.slice(0, 2).toUpperCase();

export default function ProfilePage() {
  const profileQuery = useMyProfile();
  const accessQuery = useCurrentAccess();
  const updateProfile = useUpdateProfile();
  const profile = profileQuery.data, access = accessQuery.data;
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => { if (profile) { setFirstName(profile.first_name ?? profile.name ?? ""); setLastName(profile.last_name ?? ""); setPhone(profile.phone ?? ""); setPreview(profile.profile_url); } }, [profile]);
  const save = async () => { if (!firstName.trim()) { toast.error("Enter your first name"); return; } try { await updateProfile.mutateAsync({ first_name: firstName.trim(), last_name: lastName.trim(), phone, image }); toast.success("Profile updated successfully"); setImage(null); setEditing(false); } catch (error: unknown) { const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message; toast.error(message ?? "Unable to update profile"); } };

  if (profileQuery.isLoading || accessQuery.isLoading) return <><PageHeader title="My Profile" description="Your signed-in account." /><div className="grid gap-4 lg:grid-cols-[20rem_1fr]"><CardSkeleton /><CardSkeleton /></div></>;
  if (profileQuery.isError || accessQuery.isError || !profile || !access) return <><PageHeader title="My Profile" description="Your signed-in account." /><SectionCard><EmptyState title="Profile could not be loaded" description="Check the API connection and try again." action={<Button variant="outline" onClick={() => { profileQuery.refetch(); accessQuery.refetch(); }}>Try again</Button>} /></SectionCard></>;

  return <><PageHeader title="My Profile" description="Manage your personal information and review your access." actions={editing ? <div className="flex gap-2"><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button><Button disabled={updateProfile.isPending} onClick={save}>{updateProfile.isPending ? "Saving…" : "Save changes"}</Button></div> : <Button onClick={() => setEditing(true)}>Edit profile</Button>} />
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <SectionCard><div className="flex flex-col items-center text-center"><Avatar className="size-24"><AvatarImage src={preview ?? undefined} /><AvatarFallback className="text-xl">{initials(firstName, lastName, profile.username)}</AvatarFallback></Avatar><h2 className="mt-4 text-xl font-semibold">{`${firstName} ${lastName}`.trim() || profile.username}</h2><p className="mt-1 text-sm text-muted-foreground">{profile.email}</p><div className="mt-3 flex flex-wrap justify-center gap-2"><Badge>{access.role ?? "No role"}</Badge><Badge variant={profile.is_active ? "default" : "secondary"}>{profile.is_active ? "Active" : "Inactive"}</Badge></div>{editing && <Field label="Profile photo" className="mt-5 w-full text-left"><Input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0] ?? null; setImage(file); if (file) setPreview(URL.createObjectURL(file)); }} /></Field>}</div></SectionCard>
      <div className="space-y-4">
        <SectionCard title="Personal information"><div className="grid gap-4 sm:grid-cols-2"><Field label="First name"><Input value={firstName} disabled={!editing} onChange={(event) => setFirstName(event.target.value)} /></Field><Field label="Last name"><Input value={lastName} disabled={!editing} onChange={(event) => setLastName(event.target.value)} /></Field><Field label="Mobile"><Input value={phone} disabled={!editing} maxLength={10} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} /></Field><Field label="Email" help="Managed by User Management"><Input value={profile.email ?? ""} disabled /></Field></div></SectionCard>
        <SectionCard title="Account information"><div className="grid gap-4 sm:grid-cols-2"><Field label="Username"><Input value={profile.username} disabled /></Field><Field label="Role"><Input value={access.role ?? "Unassigned"} disabled /></Field><Field label="Date joined"><Input value={formatDate(profile.date_joined)} disabled /></Field><Field label="Last login"><Input value={formatDate(profile.last_login)} disabled /></Field></div></SectionCard>
        <SectionCard title="Your access" description="View-only access inherited from your assigned role.">{access.is_super_admin ? <div className="rounded-xl border bg-muted/20 p-4"><p className="font-semibold">Full Access</p><p className="mt-1 text-sm text-muted-foreground">You have full administrative access to every registered module and permission.</p></div> : <AccessSummary permissions={access.permission_details} selectedCodes={access.permissions} />}</SectionCard>
        <SectionCard title="Password"><p className="text-sm text-muted-foreground">Self-service password change is not available in the current Django API. Contact a Super Admin if your password needs to be reset.</p></SectionCard>
      </div>
    </div>
  </>;
}
