import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthContext, useAuthProvider } from './hooks/useAuth';
import { BottomNav } from './components/BottomNav';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Session } from './pages/Session';
import { SessionDebrief } from './pages/SessionDebrief';
import { Memory } from './pages/Memory';
import { Digest } from './pages/Digest';
import { Settings } from './pages/Settings';
import { Loader } from 'lucide-react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem('angel_token');

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const auth = useAuthProvider();

  if (auth.loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <Loader size={28} className="text-primary animate-spin-slow" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <div className="min-h-dvh bg-bg flex flex-col">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/session"
            element={
              <AuthGuard>
                <Session />
              </AuthGuard>
            }
          />
          <Route
            path="/session/:id/debrief"
            element={
              <AuthGuard>
                <SessionDebrief />
              </AuthGuard>
            }
          />
          <Route
            path="/memory"
            element={
              <AuthGuard>
                <Memory />
              </AuthGuard>
            }
          />
          <Route
            path="/digest"
            element={
              <AuthGuard>
                <Digest />
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <Settings />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </div>
    </AuthContext.Provider>
  );
}
