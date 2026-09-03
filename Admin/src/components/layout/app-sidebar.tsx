import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { flatNav, navigation, isGroup, type NavEntry } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AttentionModule } from "@/features/attention/use-attention-center";
import { hasPermission, permissionForRoute, useCurrentAccess } from "@/features/auth/rbac";
import { useCrmDashboard } from "@/features/crm/hooks";

const attentionModuleByRoute: Record<string, AttentionModule> = {
  "/crm/leads": "leads",
  "/crm/leads/follow-ups": "followUps",
  "/crm/quotations": "quotations",
  "/crm/orders": "orders",
  "/crm/invoices": "invoices",
  "/crm/delivery": "delivery",
};

export function SidebarNav({
  collapsed = false,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  const pathname = useLocation().pathname;
  const { data: dashboard } = useCrmDashboard();
  const counts: Record<AttentionModule, number> = {
    leads: dashboard?.actionable.leads ?? 0,
    followUps: dashboard?.actionable.follow_ups ?? 0,
    quotations: dashboard?.actionable.quotations ?? 0,
    orders: dashboard?.actionable.orders ?? 0,
    invoices: dashboard?.actionable.invoices ?? 0,
    delivery: dashboard?.actionable.deliveries ?? 0,
    customers: 0,
  };
  const { data: access } = useCurrentAccess();
  const canSee = (to: string) => { const required = permissionForRoute(to); return !required || hasPermission(access, required); };
  const groupOpenByRoute = (entry: NavEntry) =>
    isGroup(entry) && entry.items.some((i) => pathname === i.to || pathname.startsWith(i.to + "/"));
  const [open, setOpen] = useState<string[]>(
    navigation.filter(groupOpenByRoute).map((g) => (g as { label: string }).label),
  );

  // Select exactly one navigation destination. Longest-route matching keeps
  // parent dashboards from appearing active on their child workspaces.
  // Customer detail routes belong to Customer Management, not analytics.
  const customerDetail = /^\/crm\/customers\/(?!manage(?:\/|$))[^/]+/.test(pathname);
  const activeRoute = customerDetail
    ? "/crm/customers/manage"
    : flatNav
        .filter((item) => pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to + "/")))
        .sort((a, b) => b.to.length - a.to.length)[0]?.to ?? (pathname === "/" ? "/" : null);
  const isActive = (to: string) => to === activeRoute;

  const priority = navigation
    .filter((e): e is Exclude<NavEntry, { items: unknown }> => !isGroup(e))
    .slice(0, 3);
  const rest = navigation.filter((e) => !priority.includes(e as never));

  const renderItem = (entry: NavEntry & { comingSoon?: boolean }, emphasised = false) => {
    if (isGroup(entry)) return null;
    if (!canSee(entry.to)) return null;
    const active = isActive(entry.to);
    const module = attentionModuleByRoute[entry.to];
    const attentionCount = module ? counts[module] : 0;
    return (
      <Link
        key={entry.to}
        to={entry.to}
        onClick={onNavigate}
        title={entry.label}
        className={cn(
          "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          collapsed && "justify-center px-2",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          emphasised && !active && "text-sidebar-foreground",
        )}
      >
        {active && (
          <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
        )}
        <entry.icon className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{entry.label}</span>}
        {attentionCount > 0 && (
          <span className={cn("ml-auto min-w-5 rounded-full bg-white/12 px-1.5 text-center text-[10px] font-bold leading-5", collapsed && "absolute -top-1 -right-1")}>
            {attentionCount > 99 ? "99+" : attentionCount}
          </span>
        )}
        {!collapsed && entry.comingSoon && (
          <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-sidebar-foreground/60 uppercase">
            Soon
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <Link to="/" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-soft">
            <img src="/logo.png" alt="Magilshe" className="size-7 object-contain" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight">Magilshe</span>
              <span className="block truncate text-[11px] text-sidebar-foreground/55">
                Admin Centre
              </span>
            </span>
          )}
        </Link>
        {!collapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="ml-auto hidden text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground lg:block"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      {collapsed && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="mx-auto mt-3 text-sidebar-foreground/50 hover:text-sidebar-foreground"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      <ScrollArea className="flex-1">
        <nav className={cn("space-y-1 px-2.5 py-3", collapsed && "px-2")}>
          {priority.map((entry) => renderItem(entry, true))}
        </nav>

        {!collapsed && (
          <p className="px-6 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-sidebar-foreground/40 uppercase">
            Workspaces
          </p>
        )}
        <nav className={cn("space-y-1 px-2.5 pb-3", collapsed && "px-2")}>
          {rest.map((entry) => {
            if (!isGroup(entry)) return renderItem(entry);
            const visibleItems = entry.items.filter((item) => canSee(item.to));
            if (!visibleItems.length) return null;
            const expanded = open.includes(entry.label);
            const groupActive = entry.items.some((i) => isActive(i.to));
            return (
              <div key={entry.label} className="pt-1">
                <button
                  onClick={() =>
                    collapsed
                      ? undefined
                      : setOpen((o) =>
                          expanded ? o.filter((l) => l !== entry.label) : [...o, entry.label],
                        )
                  }
                  title={entry.label}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    groupActive
                      ? "text-sidebar-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                  )}
                >
                  <entry.icon className="size-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="truncate">{entry.label}</span>
                      <ChevronDown
                        className={cn(
                          "ml-auto size-3.5 transition-transform",
                          expanded && "rotate-180",
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && expanded && (
                  <div className="mt-1 ml-4 space-y-0.5 border-l border-sidebar-border pl-3">
                    {visibleItems.map((item) => {
                      const active = isActive(item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={onNavigate}
                          className={cn(
                            "relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors",
                            active
                              ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                          )}
                        >
                          <item.icon className="size-3.5 shrink-0 opacity-80" />
                          <span className="truncate">{item.label}</span>
                          {attentionModuleByRoute[item.to] && counts[attentionModuleByRoute[item.to]!] > 0 && (
                            <span className="ml-auto min-w-5 rounded-full bg-white/12 px-1.5 text-center text-[10px] font-bold leading-5">
                              {counts[attentionModuleByRoute[item.to]!] > 99 ? "99+" : counts[attentionModuleByRoute[item.to]!]}
                            </span>
                          )}
                          {item.comingSoon && (
                            <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-sidebar-foreground/50 uppercase">
                              Soon
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
