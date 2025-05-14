import { Card, CardContent } from "@/components/ui/card";

interface LeaveSummaryProps {
  annual: { total: number; butters: number; makana: number };
  sick: { total: number; butters: number; makana: number };
  unpaid: { total: number; butters: number; makana: number };
  pending: { total: number; butters: number; makana: number };
  isLoading: boolean;
}

export function LeaveSummary({ annual, sick, unpaid, pending, isLoading }: LeaveSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="h-6 w-36 bg-neutral-200 rounded animate-pulse mb-2"></div>
              <div className="flex items-center justify-between">
                <div className="h-8 w-12 bg-neutral-200 rounded animate-pulse"></div>
                <div className="flex flex-col space-y-1">
                  <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse"></div>
                  <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card className="bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">Annual Leave</h3>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold">{annual.total}</p>
            <div className="flex flex-col text-sm">
              <span className="text-secondary">Butters: {annual.butters}</span>
              <span className="text-primary">Makana: {annual.makana}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">Sick Leave</h3>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold">{sick.total}</p>
            <div className="flex flex-col text-sm">
              <span className="text-secondary">Butters: {sick.butters}</span>
              <span className="text-primary">Makana: {sick.makana}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">Unpaid Leave</h3>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold">{unpaid.total}</p>
            <div className="flex flex-col text-sm">
              <span className="text-secondary">Butters: {unpaid.butters}</span>
              <span className="text-primary">Makana: {unpaid.makana}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">Pending Approvals</h3>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold">{pending.total}</p>
            <div className="flex flex-col text-sm">
              <span className="text-secondary">Butters: {pending.butters}</span>
              <span className="text-primary">Makana: {pending.makana}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
