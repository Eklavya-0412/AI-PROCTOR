import { Link } from 'react-router-dom'; // Assuming you are using react-router

export default function HomeView() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-primary selection:text-white">
      
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold text-zinc-100 tracking-tight">
            Proctor<span className="text-primary">AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="text-sm font-medium bg-primary text-zinc-950 px-4 py-2 rounded-md hover:bg-primaryHover transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 flex flex-col items-center justify-center min-h-[90vh] text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-zinc-100 tracking-tight max-w-4xl mb-6">
          Secure execution. <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 to-zinc-600">
            Intelligent evaluation.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10">
          The next-generation online judge featuring isolated sandboxing, browser-based telemetry, and automated viva interviews.
        </p>
        
        {/* The smooth scroll trigger */}
        <a 
          href="#features" 
          className="group flex items-center gap-2 text-base font-semibold text-zinc-100 border border-zinc-700 bg-zinc-900/50 px-6 py-3 rounded-full hover:border-primary hover:text-primary transition-all duration-300"
        >
          Get Started
          <svg className="w-4 h-4 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </section>

      {/* Feature Section Target */}
      <section id="features" className="min-h-screen bg-zinc-900 pt-24 px-6 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-zinc-100 mb-12 text-center">Core Features</h2>
          {/* We will build the feature grid here next */}
        </div>
      </section>
      
    </div>
  );
}