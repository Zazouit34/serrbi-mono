import AutoApplySettingsPage from "@/components/ui/subscription/auto-apply-client";

export default function AutoApplyPageClient() {
  return (
    <div className="flex flex-col items-center space-y-8">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold font-outfit">Automated Job Application</h1>
        <p className="text-center text-muted-foreground font-outfit">
          Set up your auto-apply preferences to let us automatically apply to jobs for you.
        </p>
      </div>
      <AutoApplySettingsPage />
    </div>
  );
}