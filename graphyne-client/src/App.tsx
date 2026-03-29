import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './lib/auth-client';

// Import your pages
import { SetupPage } from './pages/SetupPage';
import { LoginPage } from './pages/LoginPage';
import { EditorPage } from './pages/EditorPage'; 
import { PlayoutPage } from './pages/PlayoutPage';
import AssetsPage from './pages/AssetsPage';

// A wrapper component that forces login
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="flex h-screen items-center justify-center bg-zinc-900 text-white">Loading System...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (session.user as any).role || 'editor';
  
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <div className="flex h-screen items-center justify-center bg-zinc-900 text-white">Access Denied: You do not have permission for this module.</div>;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'editor']}>
              <EditorPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/playout" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'playout']}>
              <PlayoutPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/assets" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'editor']}>
              <AssetsPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}