import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { Dashboard, Templates, Contacts, SendEmails, Settings, Analytics } from './pages';
import Auth from './pages/Auth';
import { CampaignProvider } from './context/CampaignContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingSpinner } from './components/UI';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 max-w-350">
          {children}
        </main>
      </div>
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-100 via-white to-purple-100">
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
