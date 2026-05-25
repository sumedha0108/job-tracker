import { useState } from 'react';
import axios from 'axios';

export default function JobForm({ onJobAdded, onCancel }) {
  const [formData, setFormData] = useState({
    company: '', role: '', apply_url: '', status: 'applied',
    expected_salary: '', track_url: '',
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/jobs', {
        ...formData,
        expected_salary: formData.expected_salary ? parseFloat(formData.expected_salary) : null,
      });
      onJobAdded();
    } catch (err) {
      console.error(err);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all";
  const labelClass = "block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider";

  return (
    <div className="bg-[#16161d] border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="text-xl font-bold text-white">New Application</h2>
        <button onClick={onCancel} className="text-white/30 hover:text-white/70 transition text-xl leading-none">✕</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Company</label>
            <input name="company" value={formData.company} onChange={handleChange} placeholder="Google" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <input name="role" value={formData.role} onChange={handleChange} placeholder="SWE Intern" className={inputClass} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Status */}
          <div>
            <label className={labelClass}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="not_applied">Not Applied</option>
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Salary */}
          <div className="relative">
            <label className={labelClass}>Expected Salary</label>
            <span className="absolute left-3 top-[34px] text-white/40 text-sm">₹</span>
            <input
              name="expected_salary"
              type="number"
              value={formData.expected_salary}
              onChange={handleChange}
              placeholder="120000"
              className={`${inputClass} pl-7`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Apply URL</label>
          <input name="apply_url" value={formData.apply_url} onChange={handleChange} placeholder="https://..." className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Track URL</label>
          <input name="track_url" value={formData.track_url} onChange={handleChange} placeholder="https://..." className={inputClass} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm font-medium transition-all">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5">
            Save Job
          </button>
        </div>
      </form>
    </div>
  );
}