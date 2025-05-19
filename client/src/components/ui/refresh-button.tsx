import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/query-client";

interface RefreshButtonProps {
  queryKeys?: string[];
  label?: string;
  className?: string;
  onRefresh?: () => Promise<void>;
}

export function RefreshButton({ 
  queryKeys = [], 
  label = "Refresh", 
  className = "",
  onRefresh
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      if (onRefresh) {
        await onRefresh();
      } else if (queryKeys.length > 0) {
        // Invalidate all the query keys to force a refresh
        queryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
      
      toast({
        title: "Refreshed",
        description: "Data has been refreshed successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Refresh failed",
        description: "There was an error refreshing the data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`flex items-center gap-1 ${className}`}
    >
      <RefreshCw size={16} className={`${isRefreshing ? "animate-spin" : ""}`} />
      {label}
    </Button>
  );
}