import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Field } from "@/components/shared/field";
import { CardSkeleton } from "@/components/shared/skeletons";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useTermsAndConditions,
  useSaveTermsAndConditions,
  usePrivacyPolicy,
  useSavePrivacyPolicy,
} from "@/features/settings/settings-hooks";

/**
 * Mirrors Admin/src/components/Terms&condtions/Terms.jsx, which covers both
 * Terms & Conditions and Privacy Policy as two editable sections of the same
 * module (EditTerms.jsx / EditPolicy.jsx), each a single rich-text `content`
 * field saved via PUT.
 */
function TermsPage() {
  const { data: termsContent, isLoading: termsLoading } = useTermsAndConditions();
  const saveTerms = useSaveTermsAndConditions();

  const { data: policyContent, isLoading: policyLoading } = usePrivacyPolicy();
  const savePolicy = useSavePrivacyPolicy();

  const [terms, setTerms] = useState("");
  const [termsLoaded, setTermsLoaded] = useState(false);
  const [policy, setPolicy] = useState("");
  const [policyLoaded, setPolicyLoaded] = useState(false);

  useEffect(() => {
    if (termsContent !== undefined && !termsLoaded) {
      setTerms(termsContent);
      setTermsLoaded(true);
    }
  }, [termsContent, termsLoaded]);

  useEffect(() => {
    if (policyContent !== undefined && !policyLoaded) {
      setPolicy(policyContent);
      setPolicyLoaded(true);
    }
  }, [policyContent, policyLoaded]);

  const handleSaveTerms = async () => {
    if (!terms.trim()) { toast.error("Terms & Conditions content is required"); return; }
    try {
      await saveTerms.mutateAsync(terms);
      toast.success("Terms & Conditions updated successfully");
    } catch {
      toast.error("Unable to update Terms & Conditions");
    }
  };

  const handleSavePolicy = async () => {
    if (!policy.trim()) { toast.error("Privacy Policy content is required"); return; }
    try {
      await savePolicy.mutateAsync(policy);
      toast.success("Privacy Policy updated successfully");
    } catch {
      toast.error("Unable to update Privacy Policy");
    }
  };

  return (
    <>
      <PageHeader title="Terms & Policies" description="Customer-facing terms and privacy policy content." />
      <Tabs defaultValue="terms">
        <TabsList>
          <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
          <TabsTrigger value="policy">Privacy Policy</TabsTrigger>
        </TabsList>

        <TabsContent value="terms">
          {termsLoading ? (
            <CardSkeleton />
          ) : (
            <SectionCard
              title="Terms & Conditions"
              description="Shown to customers on the storefront"
              actions={
                <Button onClick={handleSaveTerms} disabled={saveTerms.isPending}>
                  {saveTerms.isPending ? "Saving…" : "Save terms"}
                </Button>
              }
            >
              <Field
                label="Terms & Conditions"
                required
                help="This content is shown to customers."
              >
                <Textarea rows={18} value={terms} onChange={(e) => setTerms(e.target.value)} />
              </Field>
            </SectionCard>
          )}
        </TabsContent>

        <TabsContent value="policy">
          {policyLoading ? (
            <CardSkeleton />
          ) : (
            <SectionCard
              title="Privacy Policy"
              description="How customer data is handled"
              actions={
                <Button onClick={handleSavePolicy} disabled={savePolicy.isPending}>
                  {savePolicy.isPending ? "Saving…" : "Save policy"}
                </Button>
              }
            >
              <Field
                label="Privacy Policy"
                required
                help="This content is shown to customers."
              >
                <Textarea rows={18} value={policy} onChange={(e) => setPolicy(e.target.value)} />
              </Field>
            </SectionCard>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

export default TermsPage;
