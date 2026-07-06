import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiCall } from '../lib/api';

interface Exam {
  id: string;
  title: string;
  duration_minutes: number;
  created_at: string; 
}


const PAST_RESULTS = [
  { id: 'ex-099', title: 'Intro to Go Routines', score: '95/100', status: 'Passed', date: 'Sep 15, 2026' },
  { id: 'ex-098', title: 'Binary Tree Traversal', score: '40/100', status: 'Failed', date: 'Sep 10, 2026' },
];

const STATS = {
  totalTaken: 12,
  averageScore: 82,
  problemsSolved: 45,
  globalRank: 104,
};


export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'stats'>('upcoming');
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    
    apiCall<Exam[]>('/exams', { method: 'GET' })
      .then((data) => {
        setUpcomingExams(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching exams:", err);
        setError("Failed to load upcoming exams.");
        setIsLoading(false);
      });
  }, []);
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-primary selection:text-white">
      
      {/* LEFT SIDE: Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* Header */}
        <header className="px-10 py-8 border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
            {activeTab === 'upcoming' && 'Upcoming Exams'}
            {activeTab === 'past' && 'Past Results'}
            {activeTab === 'stats' && 'My Performance'}
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {activeTab === 'upcoming' && 'Exams assigned to you that are about to start.'}
            {activeTab === 'past' && 'Review your previous submissions and scores.'}
            {activeTab === 'stats' && 'Your overall telemetry and ranking.'}
          </p>
        </header>

        {/* Dynamic Content Body */}
        <div className="p-10 max-w-5xl">
          
          {activeTab === 'upcoming' && (
            <div className="grid gap-6">
              {isLoading && <div className="text-zinc-500 animate-pulse">Loading exams from server...</div>}
              {error && <div className="text-red-500 bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</div>}
              
              {!isLoading && !error && upcomingExams.length === 0 && (
                <div className="text-zinc-500 bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-center">
                  No upcoming exams scheduled at this time.
                </div>
              )}

              {!isLoading && !error && upcomingExams.map(exam => (
                <div key={exam.id} className="group bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-primary/50 transition-all duration-300 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-100 group-hover:text-primary transition-colors">{exam.title}</h3>
                    <div className="flex gap-4 mt-2 text-sm text-zinc-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {/* Formatting the Go time.Time string cleanly */}
                        {new Date(exam.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Duration: {exam.duration_minutes} min
                      </span>
                    </div>
                  </div>
                  <Link 
                    to={`/exam/${exam.id}`}
                    className="bg-primary/10 text-primary hover:bg-primary hover:text-zinc-950 px-5 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    Enter Exam
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* TAB: PAST RESULTS */}
          {activeTab === 'past' && (
            <div className="grid gap-6">
              {PAST_RESULTS.map(result => (
                <div key={result.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-100">{result.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1">Taken on {result.date}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-zinc-100">{result.score}</div>
                    <div className={`text-sm font-medium mt-1 ${result.status === 'Passed' ? 'text-green-500' : 'text-red-500'}`}>
                      {result.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: STATS */}
          {activeTab === 'stats' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <div className="text-sm font-medium text-zinc-400">Total Exams Taken</div>
                <div className="text-4xl font-bold text-zinc-100 mt-2">{STATS.totalTaken}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <div className="text-sm font-medium text-zinc-400">Average Score</div>
                <div className="text-4xl font-bold text-zinc-100 mt-2">{STATS.averageScore}%</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <div className="text-sm font-medium text-zinc-400">Problems Solved</div>
                <div className="text-4xl font-bold text-zinc-100 mt-2">{STATS.problemsSolved}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <div className="text-sm font-medium text-zinc-400">Global Rank</div>
                <div className="text-4xl font-bold text-primary mt-2">#{STATS.globalRank}</div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* RIGHT SIDE: Navigation Bar */}
      <aside className="w-72 border-l border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-between">
        <div>
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 px-3">
            Dashboard Menu
          </div>
          <nav className="flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'upcoming' ? 'bg-primary text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}
            >
              Upcoming Exams
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'past' ? 'bg-primary text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}
            >
              Past Results
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'stats' ? 'bg-primary text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}
            >
              My Performance
            </button>
          </nav>
        </div>
      </aside>
      
    </div>
  );
}