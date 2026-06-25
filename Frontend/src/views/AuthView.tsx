import React, { useState } from 'react';

interface AuthViewProps {
  onSuccessfulAuth: (role: 'student' | 'instructor') => void;
}

export default function AuthView({ onSuccessfulAuth }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'student' | 'instructor'>('student');

  // Pure React form handler - no external SDKs
  const handleBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevents the page from refreshing
    console.log("Bypass Login Triggered!");
    
    // If on the Login tab, we route to instructor for testing. 
    // If on Registration, we route to whichever role you clicked.
    onSuccessfulAuth(isLogin ? 'instructor' : selectedRole);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6 font-sans text-gray-100">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60 shadow-2xl backdrop-blur-md">
        
        {/* Header */}
        <div className="bg-gray-900/80 p-8 text-center border-b border-gray-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 ring-1 ring-inset ring-blue-500/30">
            <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">ProctorJudge UI</h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-800 bg-gray-900/40">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${isLogin ? 'border-b-2 border-blue-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${!isLogin ? 'border-b-2 border-blue-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Create Account
          </button>
        </div>

        {/* Pure React Form */}
        <div className="p-8">
          <form onSubmit={handleBypassSubmit} className="space-y-5">
            
            {/* Show Role Selection ONLY on Create Account tab */}
            {!isLogin && (
              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium text-gray-400">Select Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setSelectedRole('student')} className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${selectedRole === 'student' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800'}`}>
                    Student
                  </button>
                  <button type="button" onClick={() => setSelectedRole('instructor')} className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${selectedRole === 'instructor' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800'}`}>
                    Instructor
                  </button>
                </div>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Full Name</label>
                <input type="text" required className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" placeholder="John Doe" />
              </div>
            )}
            
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Email Address</label>
              <input type="email" required className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" placeholder="admin@university.edu" />
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Password</label>
              <input type="password" required className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" placeholder="••••••••" />
            </div>

            <button type="submit" className="mt-4 w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-500">
              {isLogin ? 'Enter Instructor Dashboard ->' : `Enter as ${selectedRole} ->`}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}