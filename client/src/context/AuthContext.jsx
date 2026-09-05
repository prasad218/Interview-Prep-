import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "../api/client.js";
import { getToken, setToken } from "../api/authToken.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authError, setAuthError] = useState(null);

  // On first load, if a token is stored, validate it and load the user.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCheckingSession(false);
      return;
    }
    api
      .fetchMe()
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setCheckingSession(false));
  }, []);

  const signup = useCallback(async (form) => {
    setAuthError(null);
    const { token, user } = await api.signup(form);
    setToken(token);
    setUser(user);
  }, []);

  const login = useCallback(async (form) => {
    setAuthError(null);
    const { token, user } = await api.login(form);
    setToken(token);
    setUser(user);
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    setAuthError(null);
    const { token, user } = await api.loginWithGoogle(credential);
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user } = await api.fetchMe();
    setUser(user);
    return user;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        checkingSession,
        authError,
        setAuthError,
        signup,
        login,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
