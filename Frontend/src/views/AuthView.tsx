import { useEffect } from 'react';

interface AuthViewProps {
  onSuccessfulAuth: (token: string) => void;
}

export default function AuthView({ onSuccessfulAuth }: AuthViewProps) {
  // Pull the App Name straight from the .env file we created
  const APP_NAME = import.meta.env.VITE_LR_APP_NAME; 
  const REDIRECT_URL = window.location.origin; // Dynamically gets http://localhost:5173

  // 1. The Redirect to AuthStudio
  const handleLoginClick = () => {
    if (!APP_NAME) {
      alert("Configuration Error: VITE_LR_APP_NAME is missing from your frontend/.env file.");
      return;
    }
    // Sends the user to your secure AuthStudio page, and tells it to send them back here when done
    window.location.href = `https://${APP_NAME}.hub.loginradius.com/auth.aspx?action=login&return_url=${REDIRECT_URL}/login`;
  };

  // 2. The Return Journey (Catching the Token)
  useEffect(() => {
    // When LoginRadius redirects back, it puts the token in the URL: ?token=xxxxxx
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      // Clear the token from the URL for security/cleanliness so the user doesn't see it
      window.history.replaceState({}, document.title, window.location.pathname);

      // Tell App.tsx to send this token to Go to establish the secure session!
      onSuccessfulAuth(token); 
    }
  }, [onSuccessfulAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 font-sans text-zinc-100">
      <div className="text-center w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-2xl backdrop-blur-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-inset ring-primary/30">
          <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">ProctorJudge</h2>
        <p className="text-zinc-400 mb-8 text-sm">Authenticate securely via AuthStudio to access your dashboard.</p>
        
        <button 
          onClick={handleLoginClick} 
          className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-zinc-950 shadow-md transition-colors hover:bg-primaryHover"
        >
          Secure Login / Register
        </button>
      </div>
    </div>
  );
}