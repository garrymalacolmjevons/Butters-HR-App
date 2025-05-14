import { useQuery } from "@tanstack/react-query";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { ActivityList } from "@/components/dashboard/activity-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
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
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Summary Cards */}
        <SummaryCard
          title="Total Employees"
          value={isLoadingDashboard ? "Loading..." : dashboardData?.employeeCount || 0}
          icon={<Users />}
          breakdown={
            isLoadingDashboard
              ? { butters: "-", makana: "-" }
              : {
                  butters: "Hi-Tec Security",
                  makana: "Staff",
                }
          }
        />
        
        <SummaryCard
          title="Pending Leave"
          value={isLoadingDashboard ? "Loading..." : dashboardData?.pendingLeaveCount || 0}
          icon={<Calendar />}
          breakdown={
            isLoadingDashboard
              ? { butters: "-", makana: "-" }
              : {
                  butters: "Pending Approval",
                  makana: "This Month",
                }
          }
        />
        
        <SummaryCard
          title="Monthly Overtime"
          value={isLoadingDashboard ? "Loading..." : `${dashboardData?.overtimeHours || 0} hrs`}
          icon={<Clock />}
          breakdown={
            isLoadingDashboard
              ? { butters: "-", makana: "-" }
              : {
                  butters: "Regular Hours",
                  makana: "This Month",
                }
          }
        />
        
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-neutral-700">Data Last Updated</h3>
              <RefreshCw className="text-neutral-500 text-xl" />
            </div>
            <p className="text-xl font-medium">
              {isLoadingDashboard
                ? "Loading..."
                : formatDateTime(dashboardData?.lastUpdated)}
            </p>
            <Button 
              variant="ghost" 
              className="mt-2 text-sm text-primary hover:text-primary-dark flex items-center"
              onClick={handleRefresh}
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh Data
            </Button>
          </CardContent>
        </Card>
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
    </div>
  );
}
