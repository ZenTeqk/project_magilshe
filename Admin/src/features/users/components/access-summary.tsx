import type { Permission } from "../rbac-hooks";

const actionLabel = (action: string) => action.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AccessSummary({ permissions, selectedCodes, showEmpty = true }: { permissions: Permission[]; selectedCodes: string[]; showEmpty?: boolean }) {
  const modules = permissions.reduce<Record<string, Record<string, Permission[]>>>((result, permission) => {
    ((result[permission.module] ??= {})[permission.resource] ??= []).push(permission);
    return result;
  }, {});

  return <div className="grid gap-3 sm:grid-cols-2">{Object.entries(modules).map(([module, resources]) => {
    const granted = Object.entries(resources).map(([resource, items]) => ({ resource, actions: items.filter((item) => selectedCodes.includes(item.code)) })).filter((item) => item.actions.length);
    if (!showEmpty && !granted.length) return null;
    return <div key={module} className="rounded-xl border bg-background p-3"><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">{module}</h4>{!granted.length&&<span className="text-xs text-muted-foreground">No access</span>}</div>{granted.length>0&&<div className="mt-2 space-y-2">{granted.map(({resource,actions})=><div key={resource}><p className="text-sm">✓ {resource}</p><p className="pl-4 text-xs text-muted-foreground">{actions.map((item)=>actionLabel(item.action)).join(" · ")}</p></div>)}</div>}</div>;
  })}</div>;
}
