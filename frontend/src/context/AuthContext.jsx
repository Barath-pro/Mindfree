import { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("mindfree_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("mindfree_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    async function hydrate() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await apiClient.get("/auth/me");
        setUser(data.user);
        localStorage.setItem("mindfree_user", JSON.stringify(data.user));
      } catch (_error) {
        localStorage.removeItem("mindfree_token");
        localStorage.removeItem("mindfree_user");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    hydrate();
  }, [token]);

  const persistSession = (nextToken, nextUser) => {
    localStorage.setItem("mindfree_token", nextToken);
    localStorage.setItem("mindfree_user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (values) => {
    const { data } = await apiClient.post("/auth/login", values);
    persistSession(data.token, data.user);
    return data;
  };

  const register = async (values) => {
    const { data } = await apiClient.post("/auth/register", values);
    persistSession(data.token, data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("mindfree_token");
    localStorage.removeItem("mindfree_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
