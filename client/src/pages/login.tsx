import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <AuthForm />
    </div>
  );
}
