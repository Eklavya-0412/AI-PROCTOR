import React, { useState } from 'react';
import { apiCall } from '../lib/api';

const PENDING_GRADING = [
  { id: 'ex-101', title: 'Data Structures Midterm', submissions: 45, flagged: 3, date: 'Oct 24, 2026' },
  { id: 'ex-102', title: 'Algorithm Design Analysis', submissions: 38, flagged: 0, date: 'Oct 28, 2026' },
  { id: 'ex-103', title: 'Advanced Go Concurrency', submissions: 12, flagged: 1, date: 'Nov 02, 2026' },
  { id: 'ex-104', title: 'Machine Learning Basics', submissions: 25, flagged: 5, date: 'Nov 05, 2026' },
];

const PAST_GRADED = [
  { id: 'ex-099', title: 'Intro to Programming', totalStudents: 50, avgScore: '82%', gradedOn: 'Sep 20, 2026' },
  { id: 'ex-098', title: 'Database Management Systems', totalStudents: 42, avgScore: '76%', gradedOn: 'Sep 12, 2026' },
];

export default function InstructorDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'create' | 'view' | 'grade' | 'alerts'>('home');
  //exam creation state
  const [examTitle, setExamTitle] = useState('');
  const [duration, setDuration] = useState(90);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    const payload = {
      title: examTitle,
      duration_minutes: Number(duration),
      settings: {
        require_camera: true,
        require_mic: true,
        block_tab_switching: true,
        block_copy_paste: true
      },
      problem_set: [
        {
          problem_id: "prob-" + Date.now(),
          title: "Sample Problem: Two Sum",
          description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
          allowed_languages: ["python", "cpp", "go"],
          test_cases: [
            { input: "[2,7,11,15]\n9", expected_output: "[0,1]", is_hidden: false },
            { input: "[3,2,4]\n6", expected_output: "[1,2]", is_hidden: true }
          ]
        }
      ]
    };

    try {
      await apiCall('/exams', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setSubmitMessage('Success! Exam published to the database.');
      setExamTitle('');
      setDuration(90);
      setTimeout(() => setActiveTab('home'), 2000);
    } catch (error) {
      console.error(error);
      setSubmitMessage('Error: Failed to create exam. Check console.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-primary selection:text-white overflow-hidden">
      
      {/* Retractable Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out border-r border-zinc-800 bg-zinc-900/50 flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
          {isSidebarOpen && (
            <span className="font-bold text-lg text-zinc-100 tracking-tight whitespace-nowrap">
              Instructor<span className="text-primary">Panel</span>
            </span>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors mx-auto"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto overflow-x-hidden">
          <SidebarItem icon={<HomeIcon />} label="Dashboard Home" isOpen={isSidebarOpen} isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <SidebarItem icon={<CreateIcon />} label="Create Exam" isOpen={isSidebarOpen} isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} />
          <SidebarItem icon={<ViewIcon />} label="View Exams" isOpen={isSidebarOpen} isActive={activeTab === 'view'} onClick={() => setActiveTab('view')} />
          <SidebarItem icon={<GradeIcon />} label="Grade Submissions" isOpen={isSidebarOpen} isActive={activeTab === 'grade'} onClick={() => setActiveTab('grade')} />
          <SidebarItem icon={<AlertIcon />} label="Proctoring Alerts" isOpen={isSidebarOpen} isActive={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
          
          <div className="mt-auto pt-6 border-t border-zinc-800">
            <SidebarItem icon={<ProfileIcon />} label="My Profile" isOpen={isSidebarOpen} isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-zinc-950">
        
        {/* Header */}
        <header className="h-16 px-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur flex items-center sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-zinc-100 capitalize">
            {activeTab.replace('_', ' ')}
          </h2>
        </header>

        {/* Dynamic Content */}
        <div className="p-10 max-w-7xl mx-auto w-full">
          
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="space-y-12">
              
              {/* Section: Needs Grading (Horizontal Slider) */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-zinc-100">Exams Awaiting Grading</h3>
                  <button onClick={() => setActiveTab('grade')} className="text-sm font-medium text-primary hover:text-primaryHover">
                    View All &rarr;
                  </button>
                </div>
                
                {/* Horizontal Scrolling Container */}
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 hide-scrollbar">
                  {PENDING_GRADING.map((exam) => (
                    <div key={exam.id} className="min-w-[320px] max-w-[320px] snap-start bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-zinc-600 transition-colors flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-xs font-semibold px-2 py-1 bg-zinc-800 text-zinc-300 rounded uppercase tracking-wider">{exam.id}</span>
                          <span className="text-xs text-zinc-500">{exam.date}</span>
                        </div>
                        <h4 className="text-lg font-bold text-zinc-100 mb-2">{exam.title}</h4>
                        <div className="flex gap-4 text-sm mt-4">
                          <div className="flex flex-col">
                            <span className="text-zinc-500">Submissions</span>
                            <span className="font-semibold text-zinc-200">{exam.submissions}</span>
                          </div>
                          <div className="flex flex-col border-l border-zinc-700 pl-4">
                            <span className="text-zinc-500">Flagged</span>
                            <span className={`font-semibold ${exam.flagged > 0 ? 'text-red-400' : 'text-green-400'}`}>{exam.flagged}</span>
                          </div>
                        </div>
                      </div>
                      <button className="mt-6 w-full bg-primary/10 text-primary hover:bg-primary hover:text-zinc-950 py-2 rounded-lg font-medium transition-colors">
                        Start Grading
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section: Past Graded Exams (List) */}
              <section>
                <h3 className="text-2xl font-bold text-zinc-100 mb-6">Past Graded Exams</h3>
                <div className="grid gap-4">
                  {PAST_GRADED.map((exam) => (
                    <div key={exam.id} className="bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-lg flex items-center justify-between hover:bg-zinc-900 transition-colors">
                      <div>
                        <h4 className="text-base font-semibold text-zinc-200">{exam.title}</h4>
                        <p className="text-sm text-zinc-500 mt-1">Graded on {exam.gradedOn}</p>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-xs text-zinc-500">Students</p>
                          <p className="font-semibold text-zinc-300">{exam.totalStudents}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-zinc-500">Avg Score</p>
                          <p className="font-semibold text-zinc-300">{exam.avgScore}</p>
                        </div>
                        <button className="text-zinc-400 hover:text-primary p-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          )}
        
          {/* CREATE EXAM TAB */}
          {activeTab === 'create' && (
            <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-zinc-100">Draft New Exam</h3>
                <p className="text-zinc-500 mt-1">Configure the exam parameters and problem sets.</p>
              </div>

              <form onSubmit={handleCreateExam} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Exam Title</label>
                  <input 
                    type="text" 
                    required
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-primary transition-colors"
                    placeholder="e.g., CS301 Midterm: Data Structures"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Duration (Minutes)</label>
                  <input 
                    type="number" 
                    required
                    min="10"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* For Phase 3, we are hardcoding a sample problem in the state payload to ensure the DB connection works first. */}
                <div className="bg-zinc-950/50 border border-zinc-800 p-4 rounded-lg">
                  <p className="text-sm text-zinc-400 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    A default "Two Sum" problem set with hidden test cases will automatically be attached to this exam for testing purposes.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-zinc-800">
                  <span className={`text-sm font-medium ${submitMessage.includes('Success') ? 'text-green-500' : 'text-red-500'}`}>
                    {submitMessage}
                  </span>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-primary text-zinc-950 px-6 py-3 rounded-lg font-bold hover:bg-primaryHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish Exam'}
                  </button>
                </div>
              </form>
            </div>
          )}
          {/* PLACEHOLDERS FOR OTHER TABS */}
          {activeTab !== 'home' && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center border-2 border-dashed border-zinc-800 rounded-2xl">
              <div className="bg-zinc-900 p-4 rounded-full mb-4">
                <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-200 capitalize">{activeTab.replace('_', ' ')} Module</h3>
              <p className="text-zinc-500 mt-2 max-w-md">This view is currently under construction. Select the 'Dashboard Home' tab to view the primary layout.</p>
            </div>
          )}

        </div>
      </main>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

//SIDEBAR Components

function SidebarItem({ icon, label, isOpen, isActive, onClick }: { icon: React.ReactNode, label: string, isOpen: boolean, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-colors overflow-hidden ${isActive ? 'bg-primary text-zinc-950 font-medium shadow-sm' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}
      title={!isOpen ? label : undefined}
    >
      <div className="flex-shrink-0">{icon}</div>
      {isOpen && <span className="whitespace-nowrap text-sm">{label}</span>}
    </button>
  );
}

//ICONS
const HomeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const CreateIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const ViewIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const GradeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
const AlertIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const ProfileIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;