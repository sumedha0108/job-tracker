import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import JobForm from './components/JobForm';
import JobList from './components/JobList';
import Dashboard from './components/Dashboard';
import JobDetail from './pages/JobDetail';
import InterviewPage from "./pages/InterviewPage";

export default function App() {
  const [refresh, setRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="min-h-screen bg-[#0f0f13] text-white">
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
            
            <div className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
              <div>
                <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-extrabold tracking-tight text-white">JobOS</h1>
                <p className="text-xs text-white/40 mt-0.5">your job search, organised</p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 transition-all duration-200 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
              >
                <span className="text-lg leading-none">+</span> Add Job
              </button>
            </div>

            <div className="px-8 py-8">
              <Dashboard refresh={refresh} />
              <JobList refresh={refresh} onStatusChange={() => setRefresh(r => r + 1)} />
            </div>

            {showForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-lg mx-4 animate-[fadeUp_0.2s_ease_forwards]">
                  <JobForm
                    onJobAdded={() => { setRefresh(r => r + 1); setShowForm(false); }}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              </div>
            )}

            <style>{`
              @keyframes fadeUp {
                from { opacity: 0; transform: translateY(16px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        } />

        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/interview/:id" element={<InterviewPage />} />
      </Routes>
    </BrowserRouter>
  );
}