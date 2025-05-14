import { useQuery } from "@tanstack/react-query";
import { ExportRecord } from "@shared/schema";
import { PageHeader } from "@/components/ui/page-header";
import { ReportForm } from "@/components/reports/report-form";
import { RecentExports } from "@/components/reports/report-list";

type ExportRecordWithUserName = ExportRecord & { userName: string };

export default function Reports() {
  // We'll reuse the exports query for both components
  const { data: exports = [], isLoading } = useQuery<ExportRecordWithUserName[]>({
    queryKey: ["/api/export-records"],
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Reports & Exports"
        description="Generate and download reports for payroll processing"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Export Form */}
        <div className="col-span-1">
          <ReportForm />
        </div>
        
        {/* Recent Exports */}
        <div className="col-span-2">
          <RecentExports />
        </div>
      </div>
      
      {/* We're not implementing scheduled reports for now as it's not part of the core requirements */}
      {/* <ScheduledReports /> */}
    </div>
  );
}
