import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  queryKeys?: string[];
  refreshLabel?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ 
  title, 
  description, 
  queryKeys, 
  refreshLabel = "Refresh", 
  children 
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        {description && (
          <p className="text-neutral-500 mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {queryKeys && (
          <RefreshButton 
            queryKeys={queryKeys} 
            label={refreshLabel}
          />
        )}
        {children}
      </div>
    </div>
  );
}