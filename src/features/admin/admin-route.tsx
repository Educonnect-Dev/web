import { Navigate, Outlet, useLocation } from "react-router-dom";

import { getStoredAdminAuth } from "./admin-auth-storage";

export function AdminRoute() {
  const location = useLocation();
  const adminAuth = getStoredAdminAuth();
  if (!adminAuth) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

