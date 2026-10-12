import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { NotebookPage } from './pages/NotebookPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';
import './styles.css';

function Protected() {
  const { me, loading } = useAuth();
  if (loading) return <div className="center-screen"><div className="spinner" /></div>;
  if (!me) return <Navigate to="/login" replace />;
  return <Layout />;
}

// Remount on navigation between lessons so each one starts fresh.
function LessonRoute() {
  const { unitId, lessonType } = useParams();
  return <LessonPage key={`${unitId}:${lessonType}`} />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected />}>
        <Route index element={<HomePage />} />
        <Route path="lesson/:unitId/:lessonType" element={<LessonRoute />} />
        <Route path="notebook" element={<NotebookPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
