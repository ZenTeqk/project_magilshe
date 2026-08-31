import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth-storage";
import { hasAdminAccess, useCurrentAccess } from "@/features/auth/rbac";

export function RedirectIfAuthed() {
  const hasToken = isAuthenticated();
  const access = useCurrentAccess(hasToken);
  if (hasToken && !access.data && (access.isPending || access.isFetching)) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking session…</div>;
  }
  if (hasToken && access.isSuccess && hasAdminAccess(access.data)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
