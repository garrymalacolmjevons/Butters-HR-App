import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RefreshButtonProps = {
  queryKey?: string | string[];
  className?: string;
};

export function RefreshButton({ queryKey, className }: RefreshButtonProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      
      if (queryKey) {
        // If specific query keys are provided, refresh only those
        if (Array.isArray(queryKey)) {
          await Promise.all(queryKey.map(key => queryClient.invalidateQueries({ queryKey: [key] })));
        } else {
          await queryClient.invalidateQueries({ queryKey: [queryKey] });
        }
      } else {
        // Otherwise refresh all queries
        await queryClient.invalidateQueries();
      }
      
      toast({
        title: "Data refreshed",
        description: "The data has been refreshed successfully.",
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
      className={className}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      Refresh
    </Button>
  );
}