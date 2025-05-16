import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { MicrosoftLoginButton } from "@/components/auth/microsoft-login-button";
import logoPath from "@assets/Logo.jpg";

// Login form validation schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isLoginError, setIsLoginError] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user && !isAuthLoading) {
      navigate("/dashboard");
    }
  }, [user, isAuthLoading, navigate]);

  // Form initialization
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginFormValues) => {
      return apiRequest("/api/auth/login", "POST", data);
    },
    onSuccess: () => {
      setIsLoginError(false);
      window.location.href = "/dashboard"; // Force page reload to update auth state
    },
    onError: (error: Error) => {
      setIsLoginError(true);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid username or password",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  if (isAuthLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 items-center text-center">
          <div className="w-32 h-32 mb-4 rounded-full overflow-hidden">
            <img 
              src={logoPath} 
              alt="Hi-Tec Security Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <CardTitle className="text-2xl">Hi-Tec Security</CardTitle>
          <CardDescription>
            Sign in to access the payroll management system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Microsoft login option */}
          <MicrosoftLoginButton />
          
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs text-gray-500">OR</span>
            <Separator className="flex-1" />
          </div>

          {/* Standard login form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your username"
                        {...field}
                        disabled={loginMutation.isPending}
                        className={isLoginError ? "border-red-500" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={loginMutation.isPending}
                        className={isLoginError ? "border-red-500" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-amber-500 hover:bg-amber-600"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col text-center text-sm text-gray-500">
          <p>Access restricted to authorized personnel only</p>
        </CardFooter>
      </Card>
    </div>
  );
}