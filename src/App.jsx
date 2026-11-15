import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import LoadingSpinner from './components/LoadingSpinner';

function ProtectedRoute({ children }) {
  const { user, circle, loading, circleLoading } = useAuth();

  if (loading || circleLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner message="Checking your care circle..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!circle) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, circle, loading, circleLoading } = useAuth();

  if (loading || circleLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  if (user) {
    if (circle) {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function OnboardingRoute({ children }) {
  const { user, circle, loading, circleLoading } = useAuth();

  if (loading || circleLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner message="Checking circle membership..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (circle) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <OnboardingRoute>
                  <OnboardingPage />
                </OnboardingRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

