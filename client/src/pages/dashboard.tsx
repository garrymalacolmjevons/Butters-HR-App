import { useQuery } from "@tanstack/react-query";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, BanknoteIcon, DollarSign, Building, TrendingUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { RefreshButton } from "@/components/ui/refresh-button";

export default function Dashboard() {
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  // This function is no longer needed as we're using the RefreshButton component

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Butters Security Logo" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        </div>
        <RefreshButton 
          queryKeys={["/api/dashboard"]} 
          label="Refresh Dashboard" 
        />
      </div>
      
      {/* Placeholder for summary cards grid - will be re-implemented */}
      <div className="flex items-center justify-center p-8 mb-8 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-center">
          <span className="block text-primary font-semibold text-lg mb-2">Welcome to the HR Portal Dashboard</span>
          Access employee management, payroll, and policy features using the sidebar navigation
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Building className="mr-2 h-5 w-5 text-amber-500" /> Departmental Overview
            </CardTitle>
            <CardDescription>Employee distribution by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Security</span>
                <span className="font-medium">48</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Administration</span>
                <span className="font-medium">10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operations</span>
                <span className="font-medium">6</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <TrendingUpIcon className="mr-2 h-5 w-5 text-green-600" /> Financial Summary
            </CardTitle>
            <CardDescription>Monthly financial overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Policy Premiums ({dashboardData?.policyCount || 0} policies)</span>
                <span className="font-medium">{formatCurrency(dashboardData?.policyValueTotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Earnings Processed</span>
                <span className="font-medium">{formatCurrency(dashboardData?.monthlyEarnings || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deductions Applied</span>
                <span className="font-medium">{formatCurrency(dashboardData?.totalDeductions || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Bottom refresh button removed - using the one in the header instead */}
    </div>
  );
}
