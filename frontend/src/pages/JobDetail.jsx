import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

const STATUS_STYLES = {
  not_applied: { dot: 'bg-gray-400', badge: 'bg-gray-500/10 text-gray-300 border-gray-500/20', label: 'Not Applied' },
  applied:     { dot: 'bg-blue-400', badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20', label: 'Applied' },
  screening:   { dot: 'bg-amber-400', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20', label: 'Screening' },
  interview:   { dot: 'bg-violet-400', badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20', label: 'Interview' },
  offer:       { dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', label: 'Offer' },
  rejected:    { dot: 'bg-red-400', badge: 'bg-red-500/10 text-red-300 border-red-500/20', label: 'Rejected' },
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [jd, setJd] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [atsResult, setAtsResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [atsError, setAtsError] = useState(null);
  const [atsHistory, setAtsHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const last = atsHistory[atsHistory.length - 1]?.score;
  const prev = atsHistory[atsHistory.length - 2]?.score;
  const diff = last && prev ? last - prev : null;



  useEffect(() => {
    axios.get(`/api/jobs/${id}`)
      .then(res => {
        setJob(res.data);
        setJd(res.data.job_description || '');
        setEditData({
          company: res.data.company || '',
          role: res.data.role || '',
          apply_url: res.data.apply_url || '',
          track_url: res.data.track_url || '',
          expected_salary: res.data.expected_salary || '',
          status: res.data.status || 'applied',
        });
      })
      .catch(err => console.error(err));
  }, [id]);

  useEffect(() => {
    axios.get(`/api/ats/history/${id}`)
        .then(res => setAtsHistory(res.data))
        .catch(err => console.error(err));
    }, [id]);

  const saveJD = async () => {
    setSaving(true);
    await axios.patch(`/api/jobs/${id}`, { job_description: jd });
    setSaving(false);
  };

  const saveEdits = async () => {
    setSaving(true);
    await axios.patch(`/api/jobs/${id}`, {
      ...editData,
      expected_salary: editData.expected_salary ? parseFloat(editData.expected_salary) : null,
    });
    setJob(prev => ({ ...prev, ...editData }));
    setEditing(false);
    setSaving(false);
  };

  const uploadResume = async () => {
    if (!resumeFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', resumeFile);
    const res = await axios.post('/api/resumes', formData);
    await axios.patch(`/api/jobs/${id}`, { resume_id: res.data.id });
    setUploading(false);
    setJob(prev => ({ ...prev, resume_id: res.data.id, resume_filename: resumeFile.name }));
    setResumeFile(null);
  };

  const analyzeATS = async () => {
    setAnalyzing(true);
    setAtsError(null);

    try {
        const res = await axios.post(
        `/api/ats/analyze?job_id=${id}`
        );

        if (res.data.error) {
        setAtsError(res.data.error);
        setAtsResult(null);
        } else {
        setAtsResult(res.data);
        }

        const historyRes = await axios.get(
        `/api/ats/history/${id}`
        );
        setAtsHistory(historyRes.data);
    } catch (err) {
        console.error(err);
        setAtsError("Something went wrong");
    }

    setAnalyzing(false);
    };

  if (!job) return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center text-white/30">Loading...</div>
  );

  const s = STATUS_STYLES[editData.status] || STATUS_STYLES.applied;
  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 transition-all";
  const labelClass = "block text-xs text-white/30 uppercase tracking-wider mb-1";

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="min-h-screen bg-[#0f0f13] text-white">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-white/30 hover:text-white transition text-sm">← Back</button>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif" }} className="text-xl font-extrabold">{job.company}</h1>
            <p className="text-xs text-white/40">{job.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>
      </div>

      <div className="px-8 py-8 max-w-4xl mx-auto space-y-6">

        {/* Job Info */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-4">Job Info</p>
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Company</label>
                <input value={editData.company} onChange={e => setEditData({ ...editData, company: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <input value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })} className={inputClass}>
                  <option value="not_applied">Not Applied</option>
                  <option value="applied">Applied</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Expected Salary</label>
                <input type="number" value={editData.expected_salary} onChange={e => setEditData({ ...editData, expected_salary: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Apply URL</label>
                <input value={editData.apply_url} onChange={e => setEditData({ ...editData, apply_url: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Track URL</label>
                <input value={editData.track_url} onChange={e => setEditData({ ...editData, track_url: e.target.value })} className={inputClass} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Salary', value: job.expected_salary ? `$${job.expected_salary.toLocaleString()}` : '—' },
                { label: 'Applied', value: job.created_at ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' },
                { label: 'Apply URL', value: job.apply_url ? <a href={job.apply_url.startsWith('http') ? job.apply_url : `https://${job.apply_url}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">Link ↗</a> : '—' },
                { label: 'Track URL', value: job.track_url ? <a href={job.track_url.startsWith('http') ? job.track_url : `https://${job.track_url}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">Link ↗</a> : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-sm text-white/80">{value}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <button
                onClick={() => editing ? saveEdits() : setEditing(true)}
                disabled={saving}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all"
            >
                {editing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
            </button>
            {editing && (
                <button
                onClick={() => { setEditing(false); setEditData({ company: job.company, role: job.role, apply_url: job.apply_url || '', track_url: job.track_url || '', expected_salary: job.expected_salary || '', status: job.status }); }}
                className="px-4 py-2 border border-white/10 text-white/50 hover:text-white text-sm font-medium rounded-xl transition-all"
                >
                Cancel
                </button>
            )}
            </div>
        </div>

        {/* Job Description */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Job Description</p>
          <textarea
            value={jd}
            onChange={e => setJd(e.target.value)}
            placeholder="Paste the job description here..."
            rows={8}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-indigo-500/60 resize-none transition-all"
          />
          <button onClick={saveJD} disabled={saving} className="mt-3 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all">
            {saving ? 'Saving...' : 'Save JD'}
          </button>
        </div>

        {/* Resume */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Resume</p>
          {job.resume_id
            ? <a href={`/api/uploads/${job.resume_filename}`} target="_blank" rel="noreferrer" className="text-sm text-emerald-400 hover:text-emerald-300 mb-3 block transition">✓ {job.resume_filename}</a>
            : <p className="text-sm text-white/30 mb-3">No resume linked yet</p>
          }
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={e => setResumeFile(e.target.files[0])}
              className="text-sm text-white/50 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-white/10 file:text-xs file:text-white/70 file:bg-white/5 hover:file:bg-white/10 file:transition-all"
            />
            <button onClick={uploadResume} disabled={!resumeFile || uploading} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 text-white text-sm font-medium rounded-xl transition-all">
              {uploading ? 'Uploading...' : 'Upload & Link'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">
        <p className="text-xs text-indigo-300/50 uppercase tracking-wider mb-1">
            ATS Analyzer
        </p>

        <button
            onClick={analyzeATS}
            disabled={analyzing}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all mb-4"
        >
            {analyzing ? "Analyzing..." : "Analyze Resume"}
        </button>
        

        {/* ERROR */}
        {atsError && (
            <p className="text-red-400 text-sm">{atsError}</p>
        )}

        {/* RESULTS */}
        {atsResult && (
            <div className="space-y-4 mt-4">

            {/* SCORE */}
            <div>
                <p className="text-sm text-white/40">Match Score</p>
                <p className="text-3xl font-bold text-indigo-400">
                {atsResult.score}%
                </p>
            </div>

            {/* SUMMARY */}
            <div>
                <p className="text-sm text-white/40">Summary</p>
                <p className="text-sm text-white/80">{atsResult.summary}</p>
            </div>

            {/* STRONG MATCHES */}
            <div>
                <p className="text-sm text-green-400">Strong Matches</p>
                <ul className="list-disc ml-5 text-sm text-white/80">
                {atsResult.strong_matches?.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
                </ul>
            </div>

            {/* MISSING KEYWORDS */}
            <div>
                <p className="text-sm text-yellow-400">Missing Keywords</p>
                <ul className="list-disc ml-5 text-sm text-white/80">
                {atsResult.missing_keywords?.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
                </ul>
            </div>

            {/* WEAKNESSES */}
            <div>
                <p className="text-sm text-red-400">Weaknesses</p>
                <ul className="list-disc ml-5 text-sm text-white/80">
                {atsResult.weaknesses?.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
                </ul>
            </div>

            {/* SUGGESTIONS */}
            <div>
                <p className="text-sm text-indigo-300">Suggestions</p>
                <ul className="list-disc ml-5 text-sm text-white/80">
                {atsResult.suggestions?.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
                </ul>
            </div>

            {/* IMPROVED SUMMARY */}
            <div>
                <p className="text-sm text-indigo-300">Improved Summary</p>
                <p className="text-sm text-white/80">
                {atsResult.improved_summary}
                </p>
            </div>

            </div>
        )}
        </div>

        {/* Empty state */}
        {atsHistory.length === 0 && (
        <p className="text-white/30 text-sm mt-3">
            Run your first analysis to see progress
        </p>
        )}
        {atsHistory.length > 0 && (
            <div className="mt-6">

                {diff !== null && (
                    <p className={`text-sm mb-2 ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {diff >= 0 ? `+${diff}` : diff} from last attempt
                    </p>
                    )}
                <p className="text-sm text-white/40 mb-2">Score Progress</p>

                <div className="w-full h-64 bg-white/5 rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={atsHistory}>
                    <XAxis
                        dataKey="created_at"
                        tickFormatter={(val) =>
                        new Date(val).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        })
                        }
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                        labelFormatter={(val) =>
                        new Date(val).toLocaleString()
                        }
                    />
                    <Line
                        type="monotone"
                        dataKey="score"
                        strokeWidth={2}
                    />
                    </LineChart>
                </ResponsiveContainer>
                </div>
            </div>
            )}

        <button
        onClick={() => setShowHistory(!showHistory)}
        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all mb-4"
        >
        {showHistory ? "Hide History" : "View History"}
        </button>
        {showHistory && (
            <div className="mt-3 space-y-2">
                {atsHistory.slice().reverse().map((item, index) => {
                const isLatest = index === 0;

                return (
                    <div
                    key={index}
                    className={`p-3 rounded-lg text-sm ${
                        isLatest ? "bg-indigo-500/20 border border-indigo-400" : "bg-white/5"
                    }`}
                    >
                    <p className="font-medium">
                        Score: {item.score}/100
                    </p>

                    <p className="text-xs text-white/50">
                        Resume: {item.filename}
                    </p>

                    <p className="text-white/40 text-xs">
                        {new Date(item.created_at).toLocaleString()}
                    </p>

                    {isLatest && (
                        <p className="text-xs text-indigo-300 mt-1">
                        Latest
                        </p>
                    )}
                    </div>
                );
                })}
            </div>
            )}

            {job?.job_description && job?.resume_id ? (
            <button
                onClick={() => navigate(`/interview/${id}`)}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all mb-4"
            >
                🎤 Start Mock Interview
            </button>
            ) : (
            <p className="text-sm text-white/40 mt-4">
                Add job description & resume to unlock interview
            </p>
            )}
      </div>
    </div>
  );
}