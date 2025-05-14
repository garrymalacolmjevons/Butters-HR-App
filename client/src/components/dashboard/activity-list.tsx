import { ActivityLog } from "@shared/schema";
import { formatTimeAgo } from "@/lib/utils";

interface ActivityListProps {
  activities: (ActivityLog & { userName: string })[];
  isLoading: boolean;
}

export function ActivityList({ activities, isLoading }: ActivityListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-200 animate-pulse"></div>
            <div className="ml-3 flex-1">
              <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2 animate-pulse"></div>
              <div className="h-3 bg-neutral-200 rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return <p className="text-neutral-500 text-sm">No recent activity found.</p>;
  }

  const getActivityIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "login":
        return <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white">
          <i className="fas fa-sign-in-alt"></i>
        </div>;
      case "logout":
        return <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-500 flex items-center justify-center text-white">
          <i className="fas fa-sign-out-alt"></i>
        </div>;
      case "import employees":
        return <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-light flex items-center justify-center text-white">
          <i className="fas fa-file-import"></i>
        </div>;
      case "generate export":
        return <div className="flex-shrink-0 h-8 w-8 rounded-full bg-accent flex items-center justify-center text-white">
          <i className="fas fa-file-export"></i>
        </div>;
      case "create leave record":
      case "update leave record":
      case "delete leave record":
        return <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
          <i className="fas fa-calendar-alt"></i>
        </div>;
      case "create overtime record":
      case "update overtime record":
      case "delete overtime record":
        return <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-white">
          <i className="fas fa-clock"></i>
        </div>;
      case "create deduction record":
      case "update deduction record":
      case "delete deduction record":
        return <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-500 flex items-center justify-center text-white">
          <i className="fas fa-money-bill-minus"></i>
        </div>;
      case "create allowance record":
      case "update allowance record":
      case "delete allowance record":
        return <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-white">
          <i className="fas fa-money-bill-alt"></i>
        </div>;
      case "create employee":
      case "update employee":
        return <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
          <i className="fas fa-user-plus"></i>
        </div>;
      default:
        return <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-500 flex items-center justify-center text-white">
          <i className="fas fa-info"></i>
        </div>;
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start">
          {getActivityIcon(activity.action)}
          <div className="ml-3">
            <p className="text-sm font-medium">{activity.details}</p>
            <p className="text-xs text-neutral-500">
              {formatTimeAgo(activity.timestamp)} by {activity.userName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
