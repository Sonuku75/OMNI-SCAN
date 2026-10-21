"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, AuthResponse } from "@/types/api";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  getStoredUser,
  setStoredUser,
} from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<AuthResponse>;
  register: (data: { email: string; password: string; full_name?: string }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      // Ignore network errors on logout
    }
    clearAuthToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const liveUser = await apiClient.getMe();
      setUser(liveUser);
      setStoredUser(liveUser);
      setIsLoading(false);
      return liveUser;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        // Token is expired or invalid
        clearAuthToken();
        setUser(null);
      }
      setIsLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    const cachedUser = getStoredUser();
    if (cachedUser) {
      setUser(cachedUser);
    }
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
      setIsLoading(true);
      try {
        const authData = await apiClient.login(credentials);
        setAuthToken(authData.access_token);
        setUser(authData.user);
        setStoredUser(authData.user);
        setIsLoading(false);
        return authData;
      } catch (err) {
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  const register = useCallback(
    async (data: { email: string; password: string; full_name?: string }): Promise<AuthResponse> => {
      setIsLoading(true);
      try {
        const authData = await apiClient.register(data);
        setAuthToken(authData.access_token);
        setUser(authData.user);
        setStoredUser(authData.user);
        setIsLoading(false);
        return authData;
      } catch (err) {
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user || getAuthToken()),
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
