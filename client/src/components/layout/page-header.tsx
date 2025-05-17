import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  queryKeys?: string[];
}

export function PageHeader({ title, description, children, queryKeys = [] }: PageHeaderProps) {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-2 mt-4 md:mt-0">
        {queryKeys.length > 0 && (
          <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh data">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}