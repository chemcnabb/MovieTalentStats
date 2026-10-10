import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, TrendingUp, DollarSign, Award, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SabermetricsDashboard() {
  const [talentPool, setTalentPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination State Engine
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50; // Items per viewing frame
  
  // Filtering states
  const [roleFilter, setRoleFilter] = useState('');
  const [maxCostFilter, setMaxCostFilter] = useState('');

  const fetchTalent = async () => {
    setLoading(true);
    try {
      let url = '/talent/';
      const params = new URLSearchParams();
      
      if (roleFilter) params.append('role', roleFilter);
      if (maxCostFilter) params.append('max_cost', maxCostFilter);
      params.append('page', currentPage.toString());
      params.append('page_size', pageSize.toString());
      
      url += `?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tracking data');
      
      const data = await response.json();
      
      // Destructure our new paginated envelope payload safely
      setTalentPool(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total_count || 0);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset page position to 1 whenever filters shift
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, maxCostFilter]);

  // Execute network query whenever page index changes
  useEffect(() => {
    fetchTalent();
  }, [currentPage, roleFilter, maxCostFilter]);

  const handleUpdateMetric = async (id, field, value) => {
    const parsedValue = value === '' ? 0 : parseFloat(value);
    
    setTalentPool(prevPool => 
      prevPool.map(talent => 
        talent.id === id ? { ...talent, [field]: parsedValue } : talent
      )
    );

    try {
      const response = await fetch(`/talent/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: parsedValue }),
      });

      if (!response.ok) throw new Error('Failed to sync metrics');
      const updatedTalent = await response.json();
      
      setTalentPool(prevPool => 
        prevPool.map(talent => talent.id === id ? updatedTalent : talent)
      );
    } catch (err) {
      console.error("Sync error:", err);
      fetchTalent();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
          
      <header className="mb-8 border-b border-slate-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Award className="text-emerald-400" /> CREATIVE SCOUTING STUDIO
          </h1>
          <p className="text-slate-400 mt-1">
            {loading ? "Syncing Sabermetric matrix..." : `Showing ${talentPool?.length || 0} of ${totalCount.toLocaleString()} indexed talents.`}
          </p>
        </div>
      </header>

      {/* Control Module / Filters */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center shadow-lg">
        <div className="flex items-center gap-2 text-slate-400">
          <SlidersHorizontal size={18} />
          <span className="font-semibold text-xs uppercase tracking-wider">Filters:</span>
        </div>
        
        <select 
          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Disciplines</option>
          <option value="Screenwriter">Screenwriters</option>
          <option value="Director">Directors</option>
        </select>

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

      {error && <div className="bg-rose-500/20 border border-rose-500 p-4 rounded-xl mb-6">⚠️ {error}</div>}

      {loading && talentPool?.length === 0 ? (
        <div className="text-center py-12 text-slate-400 animate-pulse">Running analytical calculation queries...</div>
      ) : (
        <>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-700 text-slate-400 font-bold text-xs tracking-wider uppercase">
                  <th className="p-4">Creative Asset</th>
                  <th className="p-4">Discipline</th>
                  <th className="p-4">Audience Retention %</th>
                  <th className="p-4">Organic WOM (1-10)</th>
                  <th className="p-4">Rewrite Inefficiency %</th>
                  <th className="p-4">IP Reliance %</th>
                  <th className="p-4">Market Cost</th>
                  <th className="p-4 bg-emerald-950/40 text-emerald-400 font-black text-center">Creative WAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {talentPool?.map((talent) => (
                  <tr key={talent.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 font-bold text-white">{talent.name}</td>
                    <td className="p-4"><span className="px-2 py-0.5 rounded bg-slate-900 text-xs text-slate-300">{talent.role}</span></td>
                    <td className="p-4">
                      <input type="number" step="0.05" className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 w-20 text-center text-white focus:outline-none focus:border-emerald-500" value={talent.completion_rate} onChange={(e) => handleUpdateMetric(talent.id, 'completion_rate', e.target.value)} />
                    </td>
                    <td className="p-4">
                      <input type="number" step="0.5" className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 w-20 text-center text-white focus:outline-none focus:border-emerald-500" value={talent.word_of_mouth_score} onChange={(e) => handleUpdateMetric(talent.id, 'word_of_mouth_score', e.target.value)} />
                    </td>
                    <td className="p-4">
                      <input type="number" step="0.05" className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 w-20 text-center text-white focus:outline-none focus:border-emerald-500" value={talent.rewrite_ratio} onChange={(e) => handleUpdateMetric(talent.id, 'rewrite_ratio', e.target.value)} />
                    </td>
                    <td className="p-4">
                      <input type="number" step="0.1" className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 w-20 text-center text-white focus:outline-none focus:border-emerald-500" value={talent.ip_strength} onChange={(e) => handleUpdateMetric(talent.id, 'ip_strength', e.target.value)} />
                    </td>
                    <td className="p-4 font-mono text-slate-400">\${talent.base_cost?.toLocaleString()}</td>
                    <td className="p-4 bg-emerald-950/20 text-center font-black text-emerald-400">
                      <div className="flex items-center justify-center gap-1"><TrendingUp size={14} />{talent.creative_war}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {talentPool?.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-500">No creative profiles match the filtered query.</div>
            )}
          </div>

          {/* Connected Pagination Action Controls */}
          <footer className="mt-4 flex justify-between items-center text-sm text-slate-400">
            <div>
              Showing page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-medium hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 flex items-center gap-1 transition"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-medium hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 flex items-center gap-1 transition"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
