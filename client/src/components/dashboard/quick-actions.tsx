import { useRouter } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FolderInput, 
  Download, 
  Calendar, 
  Clock, 
  TrendingDown, 
  BadgeDollarSign 
} from "lucide-react";

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}

function QuickAction({ icon, title, onClick }: QuickActionProps) {
  return (
    <button 
      className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition flex flex-col items-center"
      onClick={onClick}
    >
      <div className="text-xl mb-2 text-primary">{icon}</div>
      <span className="text-sm font-medium">{title}</span>
    </button>
  );
}

export function QuickActions() {
  const [, navigate] = useRouter();

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-neutral-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <QuickAction
            icon={<FolderInput className="h-6 w-6" />}
            title="Import VIP Data"
            onClick={() => navigate("/employees?import=true")}
          />
          
          <QuickAction
            icon={<Download className="h-6 w-6" />}
            title="Export Payroll"
            onClick={() => navigate("/reports")}
          />
          
          <QuickAction
            icon={<Calendar className="h-6 w-6" />}
            title="Record Leave"
            onClick={() => navigate("/leave?action=new")}
          />
          
          <QuickAction
            icon={<Clock className="h-6 w-6" />}
            title="Add Overtime"
            onClick={() => navigate("/overtime?action=new")}
          />
          
          <QuickAction
            icon={<TrendingDown className="h-6 w-6" />}
            title="Add Deduction"
            onClick={() => navigate("/deductions?action=new")}
          />
          
          <QuickAction
            icon={<BadgeDollarSign className="h-6 w-6" />}
            title="Add Allowance"
            onClick={() => navigate("/allowances?action=new")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
