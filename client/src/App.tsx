import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Employees from "@/pages/employees";
// Leave page removed
import Deductions from "@/pages/deductions";
import Overtime from "@/pages/overtime";
import Allowances from "@/pages/allowances";
// Reports import removed
import Settings from "@/pages/settings";
import ImportPage from "@/pages/import";
// Staff page removed
import Policies from "@/pages/policies";
import EarningsPage from "@/pages/earnings";
import ActivityLogPage from "@/pages/activity";
import RecordsEditorPage from "@/pages/records-editor";
import MaternityTracker from "@/pages/maternity-tracker";
import GarnisheeOrders from "@/pages/garnishee-orders";
import RatesPage from "@/pages/rates";
import { AuthProvider, useAuth } from "@/lib/auth";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute component={() => (
          <Layout>
            <Dashboard />
          </Layout>
        )} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={() => (
          <Layout>
            <Dashboard />
          </Layout>
        )} />
      </Route>
      {/* Staff route removed */}
      <Route path="/employees">
        <ProtectedRoute component={() => (
          <Layout>
            <Employees />
          </Layout>
        )} />
      </Route>
      {/* Leave route removed */}
      <Route path="/deductions">
        <ProtectedRoute component={() => (
          <Layout>
            <Deductions />
          </Layout>
        )} />
      </Route>
      <Route path="/overtime">
        <ProtectedRoute component={() => (
          <Layout>
            <Overtime />
          </Layout>
        )} />
      </Route>
      <Route path="/allowances">
        <ProtectedRoute component={() => (
          <Layout>
            <Allowances />
          </Layout>
        )} />
      </Route>
      <Route path="/earnings">
        <ProtectedRoute component={() => (
          <Layout>
            <EarningsPage />
          </Layout>
        )} />
      </Route>
      {/* Reports route removed */}
      <Route path="/policies">
        <ProtectedRoute component={() => (
          <Layout>
            <Policies />
          </Layout>
        )} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={() => (
          <Layout>
            <Settings />
          </Layout>
        )} />
      </Route>
      {/* Activity logs route */}
      <Route path="/activity">
        <ProtectedRoute component={() => (
          <Layout>
            <ActivityLogPage />
          </Layout>
        )} />
      </Route>
      
      {/* Records editor with spreadsheet-like interface */}
      <Route path="/records-editor">
        <ProtectedRoute component={() => (
          <Layout>
            <RecordsEditorPage />
          </Layout>
        )} />
      </Route>
      
      {/* Maternity Tracker Page */}
      <Route path="/maternity-tracker">
        <ProtectedRoute component={() => (
          <Layout>
            <MaternityTracker />
          </Layout>
        )} />
      </Route>
      
      {/* Staff Garnishee Orders Page */}
      <Route path="/garnishee-orders">
        <ProtectedRoute component={() => (
          <Layout>
            <GarnisheeOrders />
          </Layout>
        )} />
      </Route>
      
      {/* Rates Configuration Page */}
      <Route path="/rates">
        <ProtectedRoute component={() => (
          <Layout>
            <RatesPage />
          </Layout>
        )} />
      </Route>
      
      {/* Direct access route for import page */}
      <Route path="/import">
        <ProtectedRoute component={ImportPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
