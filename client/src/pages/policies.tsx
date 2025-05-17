import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Plus, Table } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { PolicyList } from "@/components/policies/policy-list";
import { PolicyExportForm } from "@/components/policies/policy-export-form";
import PolicySpreadsheet from "@/components/policies/policy-spreadsheet";
import { useAuth } from "@/lib/auth";

export default function PoliciesPage() {
  const { user } = useAuth();
  const [showExportForm, setShowExportForm] = useState(false);
  const [activeTab, setActiveTab] = useState("policies");

  // Handle export form completion
  const handleExportSuccess = () => {
    // Keep the form open so they can download the file
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Insurance Policies"
        description="Manage staff insurance policies with Sanlam Sky, Avbob, Old Mutual, and Provident Fund"
      >
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setActiveTab("export");
              setShowExportForm(true);
            }}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </PageHeader>

      <Tabs 
        defaultValue="policies" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="spreadsheet">Spreadsheet View</TabsTrigger>
          <TabsTrigger value="export">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="policies" className="mt-6">
          <PolicyList />
        </TabsContent>
        
        <TabsContent value="spreadsheet" className="mt-6">
          <PolicySpreadsheet />
        </TabsContent>
        
        <TabsContent value="export" className="mt-6">
          {showExportForm ? (
            <div className="max-w-3xl mx-auto">
              <PolicyExportForm 
                onSuccess={handleExportSuccess}
                onCancel={() => setShowExportForm(false)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 border rounded-lg">
              <FileSpreadsheet className="h-12 w-12 text-primary/70" />
              <h3 className="text-xl font-semibold">Generate Insurance Policy Reports</h3>
              <p className="text-center text-muted-foreground">
                Create Excel reports for insurance companies with policy and payment details.
              </p>
              <Button onClick={() => setShowExportForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Report
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}