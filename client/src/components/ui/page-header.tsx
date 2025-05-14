import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="mt-4 sm:mt-0">{actions}</div>}
    </div>
  );
}

interface PageHeaderActionProps {
  icon?: ReactNode;
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

export function PageHeaderAction({
  icon,
  children,
  onClick,
  variant = "default",
}: PageHeaderActionProps) {
  return (
    <Button variant={variant} onClick={onClick} className="flex items-center space-x-2">
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </Button>
  );
}
