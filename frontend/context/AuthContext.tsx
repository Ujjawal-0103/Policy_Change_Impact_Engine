'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, setAuthToken, getAuthToken } from '@/lib/api';

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  org?: UserOrganization;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, organizationName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = pathname?.startsWith('/login') || pathname?.startsWith('/register');

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      if (!isPublicRoute) {
        router.push('/login');
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [router, isPublicRoute]);

  useEffect(() => {
    const initialToken = getAuthToken();
    if (!initialToken) {
      setIsLoading(false);
      if (!isPublicRoute) {
        router.push('/login');
      }
      return;
    }

    setToken(initialToken);
    api.get<AuthUser>('/auth/me')
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        if (!isPublicRoute) {
          router.push('/login');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pathname, isPublicRoute, router]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email, password });
      setAuthToken(res.accessToken);
      setToken(res.accessToken);
      setUser(res.user);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    organizationName?: string,
  ) => {
    setIsLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/register', {
        name,
        email,
        password,
        organizationName,
      });
      setAuthToken(res.accessToken);
      setToken(res.accessToken);
      setUser(res.user);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
