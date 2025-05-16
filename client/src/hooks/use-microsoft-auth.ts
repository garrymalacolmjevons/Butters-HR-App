import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export function useMicrosoftAuth() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const auth = useAuth();
  const { user, isLoading } = auth;

  // Function to initiate Microsoft login
  const loginWithMicrosoft = () => {
    setIsRedirecting(true);
    window.location.href = '/api/auth/microsoft';
  };

  // Function to log out
  const logout = async () => {
    setIsRedirecting(true);
    await auth.logout();
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