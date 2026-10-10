import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, UserPlus, TrendingUp, DollarSign, Award } from 'lucide-react';

export default function SabermetricsDashboard() {
  const [talentPool, setTalentPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtering & Query States
  const [roleFilter, setRoleFilter] = useState('');
  const [maxCostFilter, setMaxCostFilter] = useState('');

  // Fetch Talent Pool from FastAPI
  const fetchTalent = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:8000/talent/';
      const params = new URLSearchParams();
      
      if (roleFilter) params.append('role', roleFilter);
      if (maxCostFilter) params.append('max_cost', maxCostFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tracking data');
      
      const data = await response.json();
      setTalentPool(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever filters shift
  useEffect(() => {
    fetchTalent();
  }, [roleFilter, maxCostFilter]);

  // Handle live metric modifications via PATCH
  const handleUpdateMetric = async (id, field, value) => {
    // Parse numeric fields safely
    const parsedValue = value === '' ? 0 : parseFloat(value);
    
    // Optimistic UI Update: Instantly change client state for smooth performance
    setTalentPool(prevPool => 
      prevPool.map(talent => 
        talent.id === id ? { ...talent, [field]: parsedValue } : talent
      )
    );

    try {
      const response = await fetch(`http://localhost:8000/talent/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: parsedValue }),
      });

      if (!response.ok) throw new Error('Failed to sync data downstream');
      
      // Receive backend payload containing recalculated Sabermetric variables
      const updatedTalent = await response.json();
      
      setTalentPool(prevPool => 
        prevPool.map(talent => talent.id === id ? updatedTalent : talent)
      );
    } catch (err) {
      console.error("Sync error:", err);
      // Re-fetch database state to revert optimistic updates if network fails
      fetchTalent();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      {/* Header Profile */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Award className="text-emerald-400" /> CREATIVE SCOUTING STUDIO
          </h1>
          <p className="text-slate-400 mt-1">Isolating premium performance capabilities from distribution bias.</p>
        </div>
        <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 text-sm">
          Database Connectivity: <span className="text-emerald-400 font-bold">SQLite Connected</span>
        </div>
      </header>

      {/* Control Module / Filters */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center shadow-lg">
        <div className="flex items-center gap-2 text-slate-400">
          <SlidersHorizontal size={18} />
          <span className="font-semibold text-xs uppercase tracking-wider">Scouting Filters:</span>
        </div>
        
        {/* Role Filtering */}
        <select 
          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Disciplines</option>
          <option value="Screenwriter">Screenwriters</option>
          <option value="Director">Directors</option>
          <option value="Novelist">Novelists</option>
        </select>

        {/* Financial Ceiling Filter */}
        <div className="relative flex items-center">
          <DollarSign className="absolute left-2.5 text-slate-500" size={16} />
          <input 
            type="number"
            placeholder="Max Contract Cap"
            className="bg-slate-900 border border-slate-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 w-44"
            value={maxCostFilter}
            onChange={(e) => setMaxCostFilter(e.target.value)}
          />
        </div>
      </section>

      {/* Primary Analytics Framework */}
      {error && (
        <div className="bg-rose-500/20 border border-rose-500 text-rose-300 p-4 rounded-xl mb-6">
          ⚠️ {error}. Ensure your FastAPI process is running locally on port 8000.
        </div>
      )}

      {loading && talentPool.length === 0 ? (
        <div className="text-center py-12 text-slate-400 animate-pulse">Querying database...</div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-700 text-slate-400 font-bold text-xs tracking-wider uppercase">
                <th className="p-4">Creative Asset</th>
                <th className="p-4">Discipline</th>
                <th className="p-4">Audience Retention (Completion %)</th>
                <th className="p-4">Organic WOM (1-10)</th>
                <th className="p-4">Draft-to-Publish (Rewrite %)</th>
                <th className="p-4">IP Reliance %</th>
                <th className="p-4">Market Cost</th>
                <th className="p-4 bg-emerald-950/40 text-emerald-400 font-black text-center">Creative WAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {talentPool.map((talent) => (
                <tr key={talent.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 font-bold text-white text-base">{talent.name}</td>
                  <td className="p-4"><span className="px-2 py-1 rounded bg-slate-900 border border-slate-600 text-xs font-medium text-slate-300">{talent.role}</span></td>
                  
                  {/* Metric: Completion Rate */}
                  <td className="p-4">
                    <input 
                      type="number" 
                      step="0.05" 
                      min="0" 
                      max="1"
                      className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 w-20 text-center focus:border-emerald-500 focus:outline-none"
                      value={talent.completion_rate}
                      onChange={(e) => handleUpdateMetric(talent.id, 'completion_rate', e.target.value)}
                    />
                  </td>

                  {/* Metric: Word of Mouth Score */}
                  <td className="p-4">
                    <input 
                      type="number" 
                      step="0.5" 
                      min="1" 
                      max="10"
                      className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 w-20 text-center focus:border-emerald-500 focus:outline-none"
                      value={talent.word_of_mouth_score}
                      onChange={(e) => handleUpdateMetric(talent.id, 'word_of_mouth_score', e.target.value)}
                    />
                  </td>

                  {/* Metric: Rewrite Ratio */}
                  <td className="p-4">
                    <input 
                      type="number" 
                      step="0.05" 
                      min="0" 
                      max="1"
                      className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 w-20 text-center focus:border-emerald-500 focus:outline-none"
                      value={talent.rewrite_ratio}
                      onChange={(e) => handleUpdateMetric(talent.id, 'rewrite_ratio', e.target.value)}
                    />
                  </td>

                  {/* Metric: IP Strength */}
                  <td className="p-4">
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="1"
                      className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 w-20 text-center focus:border-emerald-500 focus:outline-none"
                      value={talent.ip_strength}
                      onChange={(e) => handleUpdateMetric(talent.id, 'ip_strength', e.target.value)}
                    />
                  </td>

                  {/* Metric: Base Cost */}
                  <td className="p-4 font-mono text-slate-300">
                    \${talent.base_cost.toLocaleString()}
                  </td>

                  {/* DYNAMIC CALCULATED VALUE: Creative WAR */}
                  <td className="p-4 bg-emerald-950/20 text-center font-black text-lg text-emerald-400 border-l border-emerald-900/50">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp size={16} />
                      {talent.creative_war}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {talentPool.length === 0 && (
            <div className="p-8 text-center text-slate-500">No creative profiles match the filtered query.</div>
          )}
        </div>
      )}
    </div>
  );
}
