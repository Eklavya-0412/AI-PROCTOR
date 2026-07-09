import { useState, useEffect, type JSX } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomeView from './views/HomeView';
import InstructorDashboard from './views/InstructorDashboard';
import StudentDashboard from './views/StudentDashboard'; 
import PreExamSetup from './views/PreExamSetup'; 
import ExamArena from './views/ExamArena'; 
import AuthView from './views/AuthView';
import { apiCall } from './lib/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'instructor' | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // --- Session Restoration Engine ---
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await apiCall<{ user_id: string, role: string }>('/auth/me', { method: 'GET' });
        const role = data.role.toLowerCase() as 'student' | 'instructor';
        setUserRole(role);
        setIsAuthenticated(true);
      } catch (err) {
        setUserRole(null);
        setIsAuthenticated(false);
      } finally {
        setIsRestoringSession(false);
      }
    };

    checkSession();
  }, []);

  // --- THE FIX: Catch the token, send to Go, and extract the real role ---
  const handleAuthCallback = async (mockRole: string, token: string, userId: string) => {
    try {
      // 1. Send the LoginRadius token to Go
      const data = await apiCall<{ role: string }>('/auth/session', {
        method: 'POST',
        body: JSON.stringify({ lr_token: token })
      });

      // 2. Go verified it! Update the state with the real role
      const verifiedRole = data.role.toLowerCase() as 'student' | 'instructor';
      setUserRole(verifiedRole);
      setIsAuthenticated(true);
      
    } catch (err) {
      console.error("Backend refused the token:", err);
      alert("Login failed during backend verification. Check console.");
    }
  };

  const handleLogout = async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error("Logout failed on backend", e);
    } finally {
      setIsAuthenticated(false);
      setUserRole(null);
    }
  };

  const ProtectedRoute = ({ children, allowedRole }: { children: JSX.Element, allowedRole: 'student' | 'instructor' }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (userRole !== allowedRole) return <Navigate to={`/${userRole}`} replace />;
    return children;
  };

  if (isRestoringSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Restoring session...
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeView />} />

        {/* Pass the new handleAuthCallback to AuthView */}
        <Route 
          path="/login" 
          element={ isAuthenticated ? <Navigate to={`/${userRole}`} replace /> : <AuthView onSuccessfulAuth={handleAuthCallback} /> } 
        />
        <Route 
          path="/signup" 
          element={ isAuthenticated ? <Navigate to={`/${userRole}`} replace /> : <AuthView onSuccessfulAuth={handleAuthCallback} /> } 
        />

        <Route 
          path="/instructor" 
          element={
            <ProtectedRoute allowedRole="instructor">
              <div className="relative min-h-screen">
                <InstructorDashboard />
                <button 
                  onClick={handleLogout} 
                  className="fixed bottom-4 right-4 z-50 rounded bg-red-600/80 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-red-500"
                >
                  Sign Out
                </button>
              </div>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/student" 
          element={
            <ProtectedRoute allowedRole="student">
              <div className="relative min-h-screen">
                <StudentDashboard />
                <button 
                  onClick={handleLogout} 
                  className="fixed bottom-4 right-4 z-50 rounded bg-red-600/80 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-red-500"
                >
                  Sign Out
                </button>
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route path="/exam/:id" element={ <ProtectedRoute allowedRole="student"><PreExamSetup /></ProtectedRoute> } />
        <Route path="/exam-arena/:id" element={ <ProtectedRoute allowedRole="student"><ExamArena /></ProtectedRoute> } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}