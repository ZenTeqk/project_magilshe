import { Construction } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

/** Route-level placeholder for pages whose backend isn't built yet. */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} description="This module is coming soon." />
      <EmptyState
        icon={<Construction className="size-7" />}
        title="Not available yet"
        description="This area is still being built and isn't connected to live data yet."
      />
    </>
  );
}
