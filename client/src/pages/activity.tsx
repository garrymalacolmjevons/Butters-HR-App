import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimeAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, User, FileText, Clock } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface ActivityLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  details: string | null;
  timestamp: string;
}

export default function ActivityLogPage() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["/api/activity-logs"],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Hi-Tec Security Logo" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold text-primary">Activity Logs</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>System Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity: ActivityLog) => (
                <div key={activity.id} className="flex gap-4 items-start pb-4 border-b">
                  <div className="bg-amber-100 h-10 w-10 rounded-full flex items-center justify-center text-amber-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{activity.userName}</p>
                      <span className="text-sm text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600">{activity.action}</p>
                    {activity.details && (
                      <p className="text-xs text-muted-foreground mt-1">{activity.details}</p>
                    )}
                  </div>
                </div>
              ))}

              {activities.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="mx-auto h-10 w-10 mb-2" />
                  <p>No activity logs found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}