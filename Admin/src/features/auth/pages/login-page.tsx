import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { clearTokens, setTokens } from "@/lib/auth-storage";
import { hasAdminAccess, type CurrentAccess } from "@/features/auth/rbac";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post(endpoints.auth.login, { username: email, password });
      if (!data?.tokens?.access) throw new Error(data?.message ?? "Login failed");
      setTokens(data.tokens);
      queryClient.removeQueries({ queryKey: ["rbac", "me"] });
      const { data: access } = await apiClient.get<CurrentAccess>(endpoints.rbac.me);
      if (!hasAdminAccess(access)) {
        clearTokens();
        throw new Error("This account is not an Admin account. Sign in with a staff account that has an active role.");
      }
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : null) ??
        "Couldn't sign in. Check your email and password and try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
            <img src="/logo.png" alt="Magilshe" className="size-8 object-contain" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Magilshe</span>
        </div>
        <div className="max-w-md space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Run the whole bakery business from one workspace.
          </h1>
          <p className="text-sm text-sidebar-foreground/60">
            CRM pipeline, catalog, orders, invoicing and delivery — one place for every team to see
            what needs attention today.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/40">Magilshe Admin Platform</p>
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 lg:hidden">
            <span className="grid size-10 place-items-center overflow-hidden rounded-xl border border-border bg-white">
              <img src="/logo.png" alt="Magilshe" className="size-8 object-contain" />
            </span>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Use your Magilshe admin account to continue.
            </p>
          </div>

          {(error || (location.state as { reason?: string } | null)?.reason === "not-admin") && (
            <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {error ?? "This account is not an Admin account. Sign in with a staff account that has an active role."}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-xl"
              placeholder="you@magilshe.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-xl pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="h-10 w-full rounded-xl">
            {loading && <LoaderCircle className="size-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
