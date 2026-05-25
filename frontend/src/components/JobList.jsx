import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLES = {
  not_applied: { dot: 'bg-gray-400', badge: 'bg-gray-500/10 text-gray-300 border-gray-500/20', label: 'Not Applied' },
  applied:   { dot: 'bg-blue-400',   badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',   label: 'Applied'   },
  screening: { dot: 'bg-amber-400',  badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20', label: 'Screening' },
  interview: { dot: 'bg-violet-400', badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20', label: 'Interview' },
  offer:     { dot: 'bg-emerald-400',badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', label: 'Offer' },
  rejected:  { dot: 'bg-red-400',    badge: 'bg-red-500/10 text-red-300 border-red-500/20',       label: 'Rejected'  },
};

export default function JobList({ refresh , onStatusChange}) {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    axios.get('/api/jobs')
      .then(res => setJobs(res.data))
      .catch(err => console.error(err));
  }, [refresh]);

  const navigate = useNavigate();
  const handleUserClick = (job_id) => {
    // Navigate to the dynamic path
    navigate(`/jobs/${job_id}`);
  };

  if (jobs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-white/20">
      <div className="text-5xl mb-4">📭</div>
      <p className="text-sm">No applications yet. Add your first job.</p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            {['Company', 'Role', 'Status', 'Salary', 'Resume', 'Links', 'Date'].map(h => (
              <th key={h} className="px-5 py-3.5 text-left text-xs font-medium text-white/30 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, i) => {
            const s = STATUS_STYLES[job.status] || STATUS_STYLES.applied;
            return (
              <tr key={job.id} onClick={() => handleUserClick(job.id)} className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                <td className="px-5 py-4 font-semibold text-white">{job.company}</td>
                <td className="px-5 py-4 text-white/70">{job.role}</td>
                <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                  <select
                    value={job.status}
                    onChange={async (e) => {
                      await axios.patch(`/api/jobs/${job.id}`, { status: e.target.value });
                      setJobs(jobs.map(j => j.id === job.id ? { ...j, status: e.target.value } : j));
                      onStatusChange();
                    }}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border bg-transparent cursor-pointer focus:outline-none ${STATUS_STYLES[job.status]?.badge || STATUS_STYLES.applied.badge}`}
                  >
                    <option value="not_applied">Not Applied</option>
                    <option value="applied">Applied</option>
                    <option value="screening">Screening</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </td>
                <td className="px-5 py-4 text-white/50">
                  {job.expected_salary ? `₹${job.expected_salary.toLocaleString()}` : '—'}
                </td>
                <td className="px-5 py-4 text-white/50">
                  {job.resume_filename 
                    ? <a 
                        href={`/api/uploads/${job.resume_filename}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-indigo-400 hover:text-indigo-300 transition"
                      >
                        {job.resume_filename}
                      </a>
                    : '—'
                  }
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    {job.apply_url && (
                        <a 
                            href={job.apply_url.startsWith('http') ? job.apply_url : `https://${job.apply_url}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                        >
                            Apply ↗
                        </a>
                    )}
                    {job.track_url && (
                        <a 
                            href={job.track_url.startsWith('http') ? job.track_url : `https://${job.track_url}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                        >
                            Track ↗
                        </a>
                    )}
                    {!job.apply_url && !job.track_url && <span className="text-white/20">—</span>}
                  </div>
                </td>
                <td className="px-5 py-4 text-white/30 text-xs">
                  {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}