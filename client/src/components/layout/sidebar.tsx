import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
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
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const isMobile = useIsMobile();

  // Collapse sidebar on mobile by default
  useEffect(() => {
    if (isMobile) {
      setExpanded(false);
    }
  }, [isMobile]);

  const isActive = (path: string) => {
    return location === path;
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  const NavItem = ({ 
    icon: Icon, 
    path, 
    label, 
    onClick
  }: { 
    icon: any; 
    path?: string; 
    label: string; 
    onClick?: () => void;
  }) => {
    const isPathActive = path ? isActive(path) : false;
    
    const content = (
      <div className={cn(
        "flex items-center h-12 px-3 my-1 rounded-lg transition-all duration-200",
        "hover:bg-primary/20 hover:text-primary-foreground",
        isPathActive ? "bg-primary text-white" : "text-neutral-300"
      )}>
        <Icon className="h-5 w-5 min-w-5" />
        {expanded && (
          <span className="ml-3 whitespace-nowrap overflow-hidden text-sm font-medium">
            {label}
          </span>
        )}
      </div>
    );
    
    return (
      <div className="px-2">
        {path ? (
          <Link href={path} className="block w-full">
            {content}
          </Link>
        ) : (
          <button className="w-full text-left" onClick={onClick}>
            {content}
          </button>
        )}
      </div>
    );
  };

  const isActiveDashboard = () => {
    return location === "/" || location === "/dashboard";
  };

  return (
    <aside className={cn(
      "flex flex-col bg-neutral-800 text-white h-screen transition-all duration-300 relative",
      expanded ? "w-56" : "w-16"
    )}>
      <div className="p-3 flex justify-between items-center">
        {expanded && (
          <div className="text-lg font-semibold ml-2 text-primary">Butters HR</div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "text-neutral-300 hover:text-white hover:bg-neutral-700", 
            expanded ? "ml-auto" : "mx-auto"
          )}
          onClick={toggleSidebar}
        >
          {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </Button>
      </div>

      <div className="flex flex-col overflow-y-auto flex-1 py-2">
        <NavItem 
          icon={LayoutDashboard} 
          path="/dashboard" 
          label="Dashboard" 
        />
        <NavItem 
          icon={UserCog} 
          path="/staff" 
          label="Staff" 
        />
        <NavItem 
          icon={Users} 
          path="/employees" 
          label="Employees" 
        />
        <NavItem 
          icon={BadgeDollarSign} 
          path="/earnings" 
          label="Earnings" 
        />
        <NavItem 
          icon={TrendingDown} 
          path="/deductions" 
          label="Deductions" 
        />
        <NavItem 
          icon={FileSpreadsheet} 
          path="/reports" 
          label="Reports" 
        />
      </div>

      <div className="mt-auto mb-4">
        <NavItem 
          icon={FolderInput} 
          path="/import" 
          label="Import Data" 
        />
        <NavItem 
          icon={Settings} 
          path="/settings" 
          label="Settings" 
        />
        <NavItem 
          icon={LogOut} 
          label="Logout" 
          onClick={handleLogout} 
        />
      </div>
    </aside>
  );
}
