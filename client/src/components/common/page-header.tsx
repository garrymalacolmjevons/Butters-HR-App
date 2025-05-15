import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b mb-6",
      className
    )}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}