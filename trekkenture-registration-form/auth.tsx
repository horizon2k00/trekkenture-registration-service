import React, { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiRequest, getStoredToken, storeToken } from "./api";

interface AuthValue {
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Authentication is intentionally session-scoped: closing the browser session
 * removes the JWT, while API 401 responses invalidate it across all routes.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(getStoredToken());

  useEffect(() => {
    const unauthorized = () => setToken(null);
    window.addEventListener("auth:unauthorized", unauthorized);
    return () => window.removeEventListener("auth:unauthorized", unauthorized);
  }, []);

  const login = async (username: string, password: string) => {
    const result = await apiRequest<{ access_token: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) },
      false,
    );
    storeToken(result.access_token);
    setToken(result.access_token);
  };

  const logout = () => {
    storeToken(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();
  return token ? (
    children
  ) : (
    <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  );
}
