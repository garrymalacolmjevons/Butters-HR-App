import { useQuery } from "@tanstack/react-query";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { ActivityList } from "@/components/dashboard/activity-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, BanknoteIcon, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ["/api/activity-logs"],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo.jpg" alt="Hi-Tec Security Logo" className="h-10 w-auto" />
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Summary Cards */}
        <SummaryCard
          title="Total Employees"
          value={isLoadingDashboard ? "Loading..." : dashboardData?.employeeCount || 0}
          icon={<Users className="text-amber-500" />}
          breakdown={
            isLoadingDashboard
              ? { hitec: "-", staff: "-" }
              : {
                  hitec: "Hi-Tec Security",
                  staff: "Staff",
                }
          }
        />
        
        <SummaryCard
          title="Policy Value Total"
          value={isLoadingDashboard ? "Loading..." : formatCurrency(dashboardData?.policyValueTotal || 0)}
          icon={<FileText className="text-green-600" />}
          breakdown={
            isLoadingDashboard
              ? { primary: "-", secondary: "-" }
              : {
                  primary: "Active Policies",
                  secondary: "This Month",
                }
          }
        />
        
        <SummaryCard
          title="Total Monthly Earnings"
          value={isLoadingDashboard ? "Loading..." : formatCurrency(dashboardData?.monthlyEarnings || 0)}
          icon={<BanknoteIcon className="text-blue-600" />}
          breakdown={
            isLoadingDashboard
              ? { primary: "-", secondary: "-" }
              : {
                  primary: "All Earnings",
                  secondary: "This Month",
                }
          }
        />
        
        <SummaryCard
          title="Total Deductions"
          value={isLoadingDashboard ? "Loading..." : formatCurrency(dashboardData?.totalDeductions || 0)}
          icon={<DollarSign className="text-red-500" />}
          breakdown={
            isLoadingDashboard
              ? { primary: "-", secondary: "-" }
              : {
                  primary: "All Deductions",
                  secondary: "This Month",
                }
          }
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-neutral-700 mb-4">Recent Activity</h3>
            <ActivityList activities={activities} isLoading={isLoadingActivities} />
          </CardContent>
        </Card>
        
        {/* Quick Actions */}
        <QuickActions />
      </div>
      
      <div className="flex justify-end mt-4">
        <Button 
          variant="outline" 
          className="text-primary hover:text-primary-dark flex items-center"
          onClick={handleRefresh}
        >
          Refresh Dashboard Data
        </Button>
      </div>
    </div>
  );
}
