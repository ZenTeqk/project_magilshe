import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Menu, Plus, Search, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarNav } from "./app-sidebar";
import { ThemeToggle } from "./theme-toggle";
import { NotificationCenter } from "./notification-center";
import { CommandPalette, useCommandPalette } from "./command-palette";
import { breadcrumbFor, quickCreate } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { clearTokens } from "@/lib/auth-storage";
import { hasPermission, useCurrentAccess } from "@/features/auth/rbac";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open, setOpen } = useCommandPalette();
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: access } = useCurrentAccess();
  const crumbs = breadcrumbFor(pathname);

  const logout = () => {
    clearTokens();
    queryClient.removeQueries({ queryKey: ["rbac", "me"] });
    navigate("/login");
  };

  return (
    <div className="min-h-screen w-full bg-background">
      <CommandPalette open={open} onOpenChange={setOpen} />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border transition-[width] duration-200 lg:block print:hidden",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarNav collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
      </aside>

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-16" : "lg:pl-60",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur print:hidden">
          <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 rounded-xl lg:hidden"
                    aria-label="Open navigation"
                  >
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[17rem] p-0">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <SidebarNav onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>

              <nav
                className="hidden min-w-0 items-center gap-1.5 text-sm md:flex"
                aria-label="Breadcrumb"
              >
                <Link
                  to="/"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Magilshe
                </Link>
                {crumbs.map((c, i) => (
                  <span key={c.label} className="flex min-w-0 items-center gap-1.5">
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                    {c.to && i < crumbs.length - 1 ? (
                      <Link
                        to={c.to}
                        className="truncate text-muted-foreground hover:text-foreground"
                      >
                        {c.label}
                      </Link>
                    ) : (
                      <span className="truncate font-medium">{c.label}</span>
                    )}
                  </span>
                ))}
              </nav>

              <button
                onClick={() => setOpen(true)}
                className="ml-auto hidden h-9 w-64 items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground xl:flex"
              >
                <Search className="size-4" />
                <span>Search everything</span>
                <kbd className="ml-auto rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-xl xl:hidden"
                onClick={() => setOpen(true)}
                aria-label="Search"
              >
                <Search className="size-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="hidden h-9 rounded-xl gradient-brand text-primary-foreground shadow-soft hover:opacity-95 sm:inline-flex"
                  >
                    <Plus className="size-4" /> Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Quick create</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {quickCreate.map((q) => (
                    <DropdownMenuItem key={q.label} asChild>
                      <Link to={q.to} className="flex items-center justify-between">
                        {q.label}
                        <span className="text-xs text-muted-foreground">⌘{q.hint}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <NotificationCenter />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-surface-muted">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                        <UserCircle className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-left text-xs leading-tight sm:block">
                      <span className="block max-w-36 truncate font-semibold">{access?.name ?? "Staff account"}</span>
                      <span className="block text-muted-foreground">{access?.role ?? "Magilshe Admin"}</span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Signed in</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">My profile</Link>
                  </DropdownMenuItem>
                  {hasPermission(access, "rbac.users.view") && <DropdownMenuItem asChild><Link to="/users">User Management</Link></DropdownMenuItem>}
                  {hasPermission(access, "rbac.roles.view") && <DropdownMenuItem asChild><Link to="/roles">Roles & Access</Link></DropdownMenuItem>}
                  {hasPermission(access, "configuration.view") && <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-danger" onClick={logout}>
                    <LogOut className="size-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
          <div className="mx-auto w-full max-w-[96rem] animate-rise space-y-5">{children}</div>
        </main>
      </div>

      <Button
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-5 z-30 size-12 rounded-2xl gradient-brand text-primary-foreground shadow-lift sm:hidden print:hidden"
        aria-label="Quick create"
      >
        <Plus className="size-5" />
      </Button>
    </div>
  );
}
