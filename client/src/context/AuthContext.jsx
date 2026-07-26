import { createContext, useContext, useState, useEffect } from "react";
import {
  getToken,
  setToken,
  clearToken,
  getUser,
  setUser,
  apiPost,
  apiGet,
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser());
  const [token, setTokenState] = useState(getToken());

  useEffect(() => {
    const handleExpired = () => {
      setUserState(null);
      setTokenState(null);
    };
    window.addEventListener("auth-expired", handleExpired);
    return () => window.removeEventListener("auth-expired", handleExpired);
  }, []);

  useEffect(() => {
    if (token && !user) {
      apiGet("/auth/me")
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            setUserState(data.user);
          }
        })
        .catch(() => {
          clearToken();
          setUserState(null);
          setTokenState(null);
        });
    }
  }, [token]);

  const login = async (email, password) => {
    const data = await apiPost("/auth/login", { email, password });
    if (data.error) throw new Error(data.error);
    setToken(data.token);
    setUser(data.user);
    setTokenState(data.token);
    setUserState(data.user);
    return data;
  };

  const register = async (email, password, displayName) => {
    const data = await apiPost("/auth/register", {
      email,
      password,
      displayName,
    });
    if (data.error) throw new Error(data.error);
    setToken(data.token);
    setUser(data.user);
    setTokenState(data.token);
    setUserState(data.user);
    return data;
  };

  const logout = () => {
    clearToken();
    setUserState(null);
    setTokenState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
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
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
