import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  breakdown?: {
    butters: string | number;
    makana: string | number;
  };
}

export function SummaryCard({ title, value, icon, breakdown }: SummaryCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-neutral-700">{title}</h3>
          <div className="text-primary text-xl">{icon}</div>
        </div>
        <p className="text-3xl font-bold">{value}</p>
        {breakdown && (
          <div className="text-sm text-neutral-500 mt-2">
            <span className="text-secondary">Butters: {breakdown.butters}</span> | <span className="text-primary">Makana: {breakdown.makana}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
