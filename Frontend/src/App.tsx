import { useState, type JSX } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomeView from './views/HomeView';
import InstructorDashboard from './views/InstructorDashboard';
import StudentDashboard from './views/StudentDashboard'; // Fixed import name
import PreExamSetup from './views/PreExamSetup'; // New import
import ExamArena from './views/ExamArena.tsx'; // New import
import AuthView from './views/AuthView';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'instructor' | null>(null);

  const handleLogin = (role: 'student' | 'instructor') => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
  };

  // A wrapper component to protect routes from unauthorized access
  const ProtectedRoute = ({ children, allowedRole }: { children: JSX.Element, allowedRole: 'student' | 'instructor' }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (userRole !== allowedRole) return <Navigate to={`/${userRole}`} replace />;
    return children;
  };

  return (
    <Router>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<HomeView />} />

        {/* Authentication Routes */}
        <Route 
          path="/login" 
          element={ isAuthenticated ? <Navigate to={`/${userRole}`} replace /> : <AuthView onSuccessfulAuth={handleLogin} /> } 
        />
        <Route 
          path="/signup" 
          element={ isAuthenticated ? <Navigate to={`/${userRole}`} replace /> : <AuthView onSuccessfulAuth={handleLogin} /> } 
        />

        {/* Protected Instructor Route */}
        <Route 
          path="/instructor" 
          element={
            <ProtectedRoute allowedRole="instructor">
              <div className="relative min-h-screen">
                <InstructorDashboard />
                <button 
                  onClick={handleLogout} 
                  className="fixed bottom-4 right-4 z-50 rounded bg-red-600/80 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-red-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </ProtectedRoute>
          } 
        />

        {/* Protected Student Routes */}
        <Route 
          path="/student" 
          element={
            <ProtectedRoute allowedRole="student">
              <div className="relative min-h-screen">
                <StudentDashboard />
                <button 
                  onClick={handleLogout} 
                  className="fixed bottom-4 right-4 z-50 rounded bg-red-600/80 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-red-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* 1. Hardware & Rules Gateway */}
        <Route 
          path="/exam/:id" 
          element={ <ProtectedRoute allowedRole="student"><PreExamSetup /></ProtectedRoute> } 
        />

        {/* 2. Active Exam Arena */}
        <Route 
          path="/exam-arena/:id" 
          element={ <ProtectedRoute allowedRole="student"><ExamArena /></ProtectedRoute> } 
        />

        {/* Catch-all redirect back to home for unknown URLs */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}