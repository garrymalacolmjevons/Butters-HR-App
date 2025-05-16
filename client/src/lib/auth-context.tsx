import React, { createContext, ReactNode, useContext, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  const { isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    onSuccess: (data: any) => {
      setUser(data);
    },
    onError: () => {
      setUser(null);
    }
  } as any);

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      return apiRequest("POST", "/api/auth/login", { username, password });
    },
    onSuccess: (data: any) => {
      setUser(data);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data?.fullName || 'user'}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error?.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  } as any);

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      // Still redirect to login even if logout fails
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}