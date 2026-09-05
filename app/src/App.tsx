import React, { useEffect } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { LoginPage } from "./components/auth/LoginPage";
import { DashboardPage } from "./components/dashboard/DashboardPage";

export const App: React.FC = () => {
  const { isAuthenticated, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return isAuthenticated ? <DashboardPage /> : <LoginPage />;
};

export default App;