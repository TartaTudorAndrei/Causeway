import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { SyncStatusProvider } from './context/SyncStatusContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const ProjectHubPage = React.lazy(() => import('./pages/ProjectHubPage').then(m => ({ default: m.ProjectHubPage })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminGateway = React.lazy(() => import('./pages/AdminGateway'));

const ProjectSlugRedirect = () => {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  if (projectSlug === 'volunteers') {
    return <Navigate to="/dashboard/hub/admin/volunteers" replace />;
  }
  if (projectSlug === 'config') {
    return <Navigate to="/dashboard/hub/admin/config" replace />;
  }
  const legacyTabs = ['general', 'logistics', 'finance', 'hr', 'fundraising', 'marketing', 'legal', 'admin', 'it', 'projects'];
  if (!projectSlug || legacyTabs.includes(projectSlug) || projectSlug === 'hub') {
    return <Navigate to="/dashboard/hub/general" replace />;
  }
  return <Navigate to={`/dashboard/${projectSlug}/general`} replace />;
};

const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full">
    <div className="w-8 h-8 border-3 border-zinc-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Scroll Restoration helper component
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Mobile & iOS Status Bar Theme-Color Synchronization
const ThemeColorSync = () => {
  const { pathname } = useLocation();
  const { tenant } = useTenant();

  useEffect(() => {
    const updateTheme = () => {
      const isDocDark = document.documentElement.classList.contains('dark');
      const savedTheme = localStorage.getItem('adminTheme');
      const isDarkMode = isDocDark || savedTheme !== 'light';
      const targetColor = isDarkMode ? '#09090b' : '#ffffff';

      document.body.style.colorScheme = isDarkMode ? 'dark' : 'light';

      const metaTags = document.querySelectorAll('meta[name="theme-color"]');
      if (metaTags.length > 0) {
        metaTags.forEach((el) => {
          el.setAttribute('content', targetColor);
        });
      } else {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = targetColor;
        document.head.appendChild(meta);
      }

      const statusBarStyle = isDarkMode ? 'black' : 'default';
      const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (statusBarMeta) {
        statusBarMeta.setAttribute('content', statusBarStyle);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'apple-mobile-web-app-status-bar-style';
        meta.content = statusBarStyle;
        document.head.appendChild(meta);
      }
    };

    updateTheme();

    const observer = new MutationObserver(() => {
      updateTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  }, [pathname, tenant]);

  return null;
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  return (
    <TenantProvider>
      <LanguageProvider>
        <SyncStatusProvider>
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <ErrorBoundary fallbackTitle="A apărut o problemă la afișarea aplicației" fallbackMessage="O componentă nu a putut fi randată. Vă rugăm să reîncărcați pagina sau să reîncercați.">
              <Router>
                <ScrollToTop />
                <ThemeColorSync />
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                    {/* Dashboard Auth */}
                    <Route path="/dashboard/login" element={<AdminGateway />} />
                    <Route path="/dashboard/reset-password" element={<AdminGateway />} />

                    {/* Common auth redirects */}
                    <Route path="/login" element={<Navigate to="/dashboard/login" replace />} />
                    <Route path="/autentificare" element={<Navigate to="/dashboard/login" replace />} />
                    <Route path="/admin" element={<Navigate to="/dashboard/login" replace />} />
                    <Route path="/auth" element={<Navigate to="/dashboard/login" replace />} />
                    <Route path="/authentication" element={<Navigate to="/dashboard/login" replace />} />
                    <Route path="/reset-password" element={<Navigate to="/dashboard/reset-password" replace />} />

                    {/* Dashboard Hub & Projects */}
                    <Route path="/dashboard" element={<Navigate to="/dashboard/hub/general" replace />} />
                    <Route path="/dashboard/hub" element={<Navigate to="/dashboard/hub/general" replace />} />
                    <Route path="/dashboard/hub/:section" element={
                      <ProtectedRoute requiredPermission="ANY">
                        <ProjectHubPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/hub/:section/:subTab" element={
                      <ProtectedRoute requiredPermission="ANY">
                        <ProjectHubPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/:projectSlug" element={<ProjectSlugRedirect />} />
                    <Route path="/dashboard/:projectSlug/:tab" element={
                      <ProtectedRoute requiredPermission="ANY">
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />

                    {/* All routes outside /dashboard redirect to /dashboard */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </Router>
            </ErrorBoundary>
          </GoogleOAuthProvider>
        </SyncStatusProvider>
      </LanguageProvider>
    </TenantProvider>
  );
}

export default App;
