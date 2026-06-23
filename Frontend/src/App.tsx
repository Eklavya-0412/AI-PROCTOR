import React from 'react';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center backdrop-blur-sm max-w-md">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          ProctorJudge UI Workspace
        </h1>
        <p className="mt-4 text-sm text-gray-400">
          Tailwind CSS and React + TypeScript environment successfully configured. 
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            Frontend Live
          </span>
        </div>
      </div>
    </div>
  );
}