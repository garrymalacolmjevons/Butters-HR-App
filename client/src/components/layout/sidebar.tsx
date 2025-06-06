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
  Shield,
  Activity,
  FileText,
  CreditCard,
  UserCheck,
  UserMinus,
  Wallet,
  UserIcon,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const isMobile = useIsMobile();
  const [openGroups, setOpenGroups] = useState<{[key: string]: boolean}>({});

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

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const MenuGroup = ({ 
    id, 
    icon: Icon, 
    label, 
    children 
  }: { 
    id: string;
    icon: any; 
    label: string; 
    children: React.ReactNode;
  }) => {
    const isOpen = openGroups[id];
    
    return (
      <div className="mb-2">
        <button 
          onClick={() => toggleGroup(id)} 
          className={cn(
            "flex items-center w-full px-2 py-2",
            "text-neutral-300 hover:text-white transition-colors duration-200"
          )}
        >
          <div className="flex items-center h-8 px-3 my-1 rounded-lg w-full">
            <Icon className="h-5 w-5 min-w-5" />
            {expanded && (
              <>
                <span className="ml-3 whitespace-nowrap overflow-hidden text-sm font-medium flex-grow">
                  {label}
                </span>
                <ChevronDown size={16} className={cn(
                  "transition-transform duration-200",
                  isOpen ? "transform rotate-180" : ""
                )} />
              </>
            )}
          </div>
        </button>
        <div className={cn(
          "overflow-hidden transition-all duration-200 pl-2",
          isOpen ? "max-h-96" : "max-h-0"
        )}>
          {children}
        </div>
      </div>
    );
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
        <div className="flex items-center">
          {expanded ? (
            <div className="text-lg font-semibold text-primary">Butters Security</div>
          ) : (
            <div className="text-lg font-semibold text-primary">BS</div>
          )}
        </div>
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
          icon={Calendar} 
          path="/leave" 
          label="Leave" 
        />
        
        <NavItem 
          icon={UserMinus} 
          path="/terminations" 
          label="Terminations" 
        />
        
        <NavItem 
          icon={Wallet} 
          path="/deductions" 
          label="Deductions" 
        />
        <NavItem 
          icon={Shield} 
          path="/policies" 
          label="Policies" 
        />
        <NavItem 
          icon={FileText} 
          path="/records-editor" 
          label="Records Editor" 
        />
        <NavItem 
          icon={Calendar} 
          path="/maternity-tracker" 
          label="Maternity Tracker" 
        />
        <NavItem 
          icon={Activity} 
          path="/activity" 
          label="Activity Logs" 
        />
      </div>

      <div className="mt-auto mb-4">
        <NavItem 
          icon={Settings} 
          path="/settings" 
          label="Settings" 
        />
        <NavItem 
          icon={CreditCard} 
          path="/rates" 
          label="Rates" 
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
