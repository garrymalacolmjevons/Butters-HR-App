import { Link, useLocation } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  TrendingDown, 
  Clock, 
  BadgeDollarSign,
  FileSpreadsheet,
  FolderInput,
  Settings,
  LogOut
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    return location === path;
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const SidebarIcon = ({ 
    icon: Icon, 
    path, 
    tooltip, 
    onClick
  }: { 
    icon: any; 
    path?: string; 
    tooltip: string; 
    onClick?: () => void;
  }) => {
    const isPathActive = path ? isActive(path) : false;
    
    const iconContent = (
      <div className={cn(
        "relative flex items-center justify-center h-12 w-12 mt-2 mb-2 mx-auto shadow-lg",
        "bg-neutral-800 text-primary-light hover:bg-primary hover:text-white",
        "rounded-3xl hover:rounded-xl transition-all duration-300 ease-linear",
        isPathActive && "bg-primary text-white rounded-xl"
      )}>
        <Icon className="h-6 w-6" />
      </div>
    );
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {path ? (
              <Link href={path}>{iconContent}</Link>
            ) : (
              <button onClick={onClick}>{iconContent}</button>
            )}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-neutral-900 text-white">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const isActiveDashboard = () => {
    return location === "/" || location === "/dashboard";
  };

  const dashboardIconContent = (
    <div className={cn(
      "relative flex items-center justify-center h-12 w-12 mt-2 mb-2 mx-auto shadow-lg",
      "bg-neutral-800 text-primary-light hover:bg-primary hover:text-white",
      "rounded-3xl hover:rounded-xl transition-all duration-300 ease-linear",
      isActiveDashboard() && "bg-primary text-white rounded-xl"
    )}>
      <LayoutDashboard className="h-6 w-6" />
    </div>
  );

  return (
    <div className="flex flex-col bg-neutral-800 w-16 h-screen">
      <div className="flex-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/dashboard">{dashboardIconContent}</Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-neutral-900 text-white">
              Dashboard
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <SidebarIcon icon={Users} path="/employees" tooltip="Employees" />
        <SidebarIcon icon={Calendar} path="/leave" tooltip="Leave" />
        <SidebarIcon icon={TrendingDown} path="/deductions" tooltip="Deductions" />
        <SidebarIcon icon={Clock} path="/overtime" tooltip="Overtime" />
        <SidebarIcon icon={BadgeDollarSign} path="/allowances" tooltip="Allowances" />
        <SidebarIcon icon={FileSpreadsheet} path="/reports" tooltip="Reports" />
      </div>
      <div className="flex flex-col mb-3">
        <SidebarIcon icon={FolderInput} path="/employees" tooltip="Import Data" />
        <SidebarIcon icon={Settings} path="/settings" tooltip="Settings" />
        <SidebarIcon icon={LogOut} tooltip="Logout" onClick={handleLogout} />
      </div>
    </div>
  );
}
