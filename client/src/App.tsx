import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Employees from "@/pages/employees";
import Leave from "@/pages/leave";
import Deductions from "@/pages/deductions";
import Overtime from "@/pages/overtime";
import Allowances from "@/pages/allowances";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import ImportPage from "@/pages/import";
import StaffPage from "@/pages/staff";
import Policies from "@/pages/policies";
import EarningsPage from "@/pages/earnings";
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
      <Route path="/staff">
        <ProtectedRoute component={() => (
          <Layout>
            <StaffPage />
          </Layout>
        )} />
      </Route>
      <Route path="/employees">
        <ProtectedRoute component={() => (
          <Layout>
            <Employees />
          </Layout>
        )} />
      </Route>
      <Route path="/leave">
        <ProtectedRoute component={() => (
          <Layout>
            <Leave />
          </Layout>
        )} />
      </Route>
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
      <Route path="/reports">
        <ProtectedRoute component={() => (
          <Layout>
            <Reports />
          </Layout>
        )} />
      </Route>
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
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
