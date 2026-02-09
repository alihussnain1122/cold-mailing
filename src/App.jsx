import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { Dashboard, Templates, Contacts, SendEmails, Settings, Analytics, Help, FailedEmails } from './pages';
import Auth from './pages/Auth';
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

  // If not logged in, show Auth page but remember where they wanted to go
  if (!user) {
    // If they're trying to access a protected route, save it for after login
    if (location.pathname !== '/login' && location.pathname !== '/') {
      sessionStorage.setItem('redirectAfterLogin', location.pathname);
    }
    return <Auth />;
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
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/help" element={<Help />} />
          <Route path="/failed-emails" element={<FailedEmails />} />
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
