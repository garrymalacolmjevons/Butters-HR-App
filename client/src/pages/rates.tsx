import React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { OvertimeRatesList } from "@/components/settings/overtime-rates-list";
import { EarningsRatesList } from "@/components/settings/earnings-rates-list";
import { RefreshButton } from "@/components/ui/refresh-button";

export default function RatesPage() {
  return (
    <div className="container py-4 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <PageHeader
          heading="Rates Configuration"
          text="Manage overtime and earnings rates used throughout the system"
        />
        <RefreshButton queryKey={["/api/overtime-rates", "/api/earnings-rates"]} />
      </div>

      <Tabs defaultValue="overtime" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overtime">Overtime Rates</TabsTrigger>
          <TabsTrigger value="earnings">Earnings Rates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overtime">
          <Card className="p-0">
            <OvertimeRatesList />
          </Card>
        </TabsContent>
        
        <TabsContent value="earnings">
          <Card className="p-0">
            <EarningsRatesList />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}