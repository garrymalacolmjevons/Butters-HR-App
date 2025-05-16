import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';

export function useMicrosoftAuth() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Handle authentication state
  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  // Function to initiate Microsoft login
  const loginWithMicrosoft = () => {
    setIsRedirecting(true);
    window.location.href = '/api/auth/microsoft';
  };

  // Function to log out
  const logout = () => {
    setIsRedirecting(true);
    window.location.href = '/api/auth/logout';
  };

  return {
    loginWithMicrosoft,
    logout,
    isRedirecting,
    isAuthenticated: !!user,
    isLoading,
    user
  };
}