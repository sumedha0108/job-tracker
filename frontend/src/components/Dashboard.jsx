import { useState, useEffect } from 'react';
import axios from 'axios';

const STATUS_CONFIG = {
  total:       { label: 'Total',       color: 'text-white',        bg: 'bg-white/5',           border: 'border-white/10'           },
  applied:     { label: 'Applied',     color: 'text-blue-300',     bg: 'bg-blue-500/10',       border: 'border-blue-500/20'        },
  not_applied: { label: 'Not Applied', color: 'text-gray-300',     bg: 'bg-gray-500/10',       border: 'border-gray-500/20'        },
  screening:   { label: 'Screening',   color: 'text-amber-300',    bg: 'bg-amber-500/10',      border: 'border-amber-500/20'       },
  interview:   { label: 'Interview',   color: 'text-violet-300',   bg: 'bg-violet-500/10',     border: 'border-violet-500/20'      },
  offer:       { label: 'Offer',       color: 'text-emerald-300',  bg: 'bg-emerald-500/10',    border: 'border-emerald-500/20'     },
  rejected:    { label: 'Rejected',    color: 'text-red-300',      bg: 'bg-red-500/10',        border: 'border-red-500/20'         },
};

export default function Dashboard({ refresh }) {
  const [stats, setStats] = useState({ total: 0, by_status: [] });

  useEffect(() => {
    axios.get('/api/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error(err));
  }, [refresh]);

  const getCount = (status) => {
    const found = stats.by_status.find(s => s.status === status);
    return found ? found.count : 0;
  };

  const statuses = ['applied', 'not_applied', 'screening', 'interview', 'offer', 'rejected'];

  return (
    <div className="mb-8">
      <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-3">Overview</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">

        {/* Total card */}
        <div className={`rounded-xl border ${STATUS_CONFIG.total.border} ${STATUS_CONFIG.total.bg} px-4 py-4`}>
          <p className="text-xs text-white/30 mb-1">Total</p>
          <p className={`text-2xl font-bold ${STATUS_CONFIG.total.color}`}>{stats.total}</p>
        </div>

        {/* Per status cards */}
        {statuses.map(status => {
          const config = STATUS_CONFIG[status];
          return (
            <div key={status} className={`rounded-xl border ${config.border} ${config.bg} px-4 py-4`}>
              <p className="text-xs text-white/30 mb-1">{config.label}</p>
              <p className={`text-2xl font-bold ${config.color}`}>{getCount(status)}</p>
            </div>
          );
        })}

      </div>
    </div>
  );
}