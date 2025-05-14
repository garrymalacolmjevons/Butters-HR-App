import { cn } from "@/lib/utils";

type StatusVariant = 
  | "green"
  | "yellow"
  | "red"
  | "blue"
  | "purple"
  | "gray";

const variantClasses: Record<StatusVariant, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
  gray: "bg-neutral-100 text-neutral-800",
};

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "px-2 py-1 rounded-full text-xs font-medium inline-block",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface LeaveStatusBadgeProps {
  status: string;
  className?: string;
}

export function LeaveStatusBadge({ status, className }: LeaveStatusBadgeProps) {
  const variant = status === "Approved" 
    ? "green" 
    : status === "Pending" 
      ? "yellow" 
      : "red";
  
  return (
    <StatusBadge variant={variant} className={className}>
      {status}
    </StatusBadge>
  );
}

interface EmployeeStatusBadgeProps {
  status: string;
  className?: string;
}

export function EmployeeStatusBadge({ status, className }: EmployeeStatusBadgeProps) {
  const variant = status === "Active" 
    ? "green" 
    : status === "On Leave" 
      ? "yellow" 
      : "red";
  
  return (
    <StatusBadge variant={variant} className={className}>
      {status}
    </StatusBadge>
  );
}

interface CompanyBadgeProps {
  company: string;
  className?: string;
}

export function CompanyBadge({ company, className }: CompanyBadgeProps) {
  const variant = company === "Butters" ? "blue" : "purple";
  
  return (
    <StatusBadge variant={variant} className={className}>
      {company}
    </StatusBadge>
  );
}
