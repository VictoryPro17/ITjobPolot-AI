import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardSummary } from "@/features/dashboard/DashboardSummary";
import { RecentActivity } from "@/features/dashboard/RecentActivity";

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Überblick über Ihre Bewerbungen und den Fortschritt."
      />

      <div className="space-y-6">
        <DashboardSummary />
        <RecentActivity />
      </div>
    </>
  );
}