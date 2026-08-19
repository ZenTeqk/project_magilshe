import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { isAuthenticated } from "@/lib/auth-storage";
import { hasAdminAccess, hasPermission, permissionForRoute, useCurrentAccess } from "@/features/auth/rbac";
import { Button } from "@/components/ui/button";

export function RequireAuth() {
  const location = useLocation();
  const authenticated = isAuthenticated();
  const access = useCurrentAccess(authenticated);
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  if (access.isPending || access.isFetching) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking access…</div>;
  const required = permissionForRoute(location.pathname);
  if (access.isError) return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center"><h1 className="text-xl font-semibold">Unable to verify access</h1><p className="mt-2 text-sm text-muted-foreground">Your access details could not be loaded.</p><Button className="mt-5" onClick={() => access.refetch()}>Try again</Button></div></div>;
  if (!hasAdminAccess(access.data)) return <Navigate to="/login" replace state={{ reason: "not-admin" }} />;
  if (required && !hasPermission(access.data, required)) return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center"><h1 className="text-xl font-semibold">Access denied</h1><p className="mt-2 text-sm text-muted-foreground">You do not have permission to view this area.</p><Button className="mt-5" onClick={() => history.back()}>Go back</Button></div></div>;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
