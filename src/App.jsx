import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { Dashboard, Templates, Contacts, SendEmails, Settings, Help, FailedEmails } from './pages';
import Auth from './pages/Auth';
import Landing from './pages/Landing';
import { CampaignProvider } from './context/CampaignContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingSpinner, OfflineIndicator } from './components/UI';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full min-w-0">
          {children}
        </main>
      </div>
      <OfflineIndicator />
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    if (location.pathname === '/') return <Landing />;
    if (location.pathname === '/login') return <Auth />;
    // Save destination and redirect to login
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to="/login" replace />;
  }

  // Check if there's a saved redirect path after login
  const savedPath = sessionStorage.getItem('redirectAfterLogin');
  if (savedPath) {
    sessionStorage.removeItem('redirectAfterLogin');
    return <Navigate to={savedPath} replace />;
  }

  return (
    <CampaignProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/send" element={<SendEmails />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="/failed-emails" element={<FailedEmails />} />
          <Route path="/reset-password" element={<Settings />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </CampaignProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ProtectedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
