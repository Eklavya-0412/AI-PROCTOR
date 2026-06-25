import React, { useState } from 'react';
import InstructorDashboard from './views/InstructorDashboard';
import StudentExamView from './views/StudentExamView';
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

  // If not logged in, show the LoginRadius AuthView we just built
  if (!isAuthenticated) {
    return <AuthView onSuccessfulAuth={handleLogin} />;
  }

  // If logged in as instructor, route here
  if (userRole === 'instructor') {
    return (
      <div className="relative">
        <InstructorDashboard />
        <button onClick={handleLogout} className="fixed bottom-4 right-4 rounded bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-red-500">
          Sign Out
        </button>
      </div>
    );
  }

  // If logged in as student, route here
  if (userRole === 'student') {
    return (
      <div className="relative">
        <StudentExamView />
        <button onClick={handleLogout} className="fixed bottom-4 right-4 rounded bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-red-500">
          Abandon Exam (Sign Out)
        </button>
      </div>
    );
  }

  return null;
}