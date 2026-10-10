import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, DollarSign, Award, ChevronLeft, ChevronRight, Zap, Scale, X } from 'lucide-react';

export default function SabermetricsDashboard() {
  const [talentPool, setTalentPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination & Filtering State Engine
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;
  
  const [roleFilter, setRoleFilter] = useState('');
  const [maxCostFilter, setMaxCostFilter] = useState('');
  const [undervaluedOnly, setUndervaluedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Head-to-Head Comparison Roster List Slot
  const [compareList, setCompareList] = useState([]);
  const [notice, setNotice] = useState(null);

  const fetchTalent = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/talent/';
      const params = new URLSearchParams();
      
      if (roleFilter) params.append('role', roleFilter);
      if (maxCostFilter) params.append('max_cost', maxCostFilter);
      if (undervaluedOnly) params.append('undervalued_only', 'true');
      params.append('page', currentPage.toString());
      params.append('page_size', pageSize.toString());
      
      url += `?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to synchronize database state');
      
      const data = await response.json();
      
      // Client-side text parsing for search queries to seamlessly support deep record matching
      let items = data.items || [];
      if (searchTerm) {
        items = items.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }

      setTalentPool(items);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total_count || 0);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, roleFilter, maxCostFilter, undervaluedOnly, searchTerm, pageSize]);

  useEffect(() => {
    fetchTalent();
  }, [fetchTalent]);

  const handleUpdateMetric = async (id, field, value) => {
    const parsedValue = value === '' ? 0 : parseFloat(value);
    setTalentPool(prev => prev.map(t => t.id === id ? { ...t, [field]: parsedValue } : t));

    try {
      const response = await fetch(`/talent/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: parsedValue }),
      });
      if (!response.ok) throw new Error('Failed syncing updates downstream');
      const updated = await response.json();
      setTalentPool(prev => prev.map(t => t.id === id ? updated : t));
      
      // Sync active comparison array if values change live
      setCompareList(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
    } catch (err) {
      console.error(err);
      fetchTalent();
    }
  };

  const toggleComparison = (talent) => {
    if (compareList.find(c => c.id === talent.id)) {
      setCompareList(prev => prev.filter(c => c.id !== talent.id));
    } else {
      if (compareList.length >= 2) {
        setNotice("You can compare a maximum of 2 creative assets side-by-side.");
        setTimeout(() => setNotice(null), 4000);
        return;
      }
      setCompareList(prev => [...prev, talent]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans transition-all">
      
      {/* Front Office Header Banner */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Award className="text-emerald-400" /> CREATIVE SCOUTING STUDIO
          </h1>
          <p className="text-slate-400 mt-1">
            {loading ? "Re-indexing Sabermetric arrays..." : `Analyzing ${totalCount.toLocaleString()} production matrices.`}
          </p>
        </div>
        
        {/* Metric Quick-Glance Cards */}
        <div className="flex gap-4">
          <div className="bg-slate-800 border border-slate-700/60 rounded-xl px-4 py-2.5 text-center min-w-[120px]">
            <span className="text-xs uppercase text-slate-400 font-bold block mb-0.5">Asset Limit</span>
            <span className="text-xl font-black text-emerald-400">50 / page</span>
          </div>
          <div className="bg-slate-800 border border-slate-700/60 rounded-xl px-4 py-2.5 text-center min-w-[120px]">
            <span className="text-xs uppercase text-slate-400 font-bold block mb-0.5">In Comparison</span>
            <span className="text-xl font-black text-sky-400">{compareList?.length || 0} / 2</span>
          </div>
        </div>
      </header>

      {/* Control Module / Advanced Query Suite */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <SlidersHorizontal size={14} /> Filters:
          </div>
          
          {/* Dynamic Name Lookup Input Bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 text-slate-500" size={14} />
            <input 
              type="text"
              placeholder="Search talent name..."
              className="bg-slate-900 border border-slate-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 w-48"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select 
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Disciplines</option>
            <option value="Screenwriter">Screenwriters</option>
            <option value="Director">Directors</option>
          </select>

          <div className="relative flex items-center">
            <DollarSign className="absolute left-2.5 text-slate-500" size={14} />
            <input 
              type="number"
              placeholder="Max Contract Cap"
              className="bg-slate-900 border border-slate-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 w-36"
              value={maxCostFilter}
              onChange={(e) => {
                setMaxCostFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* The Undervalued "Moneyball" Asset Finder Toggle */}
        <button
          onClick={() => {
            setUndervaluedOnly(prev => !prev);
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-black tracking-wide border transition-all ${
            undervaluedOnly 
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-emerald-950/20' 
              : 'bg-slate-900 border-slate-600 text-slate-300 hover:bg-slate-700/50'
          }`}
        >
          <Zap size={15} className={undervaluedOnly ? "animate-pulse" : ""} />
          UNDERVALUED ASSETS ONLY
        </button>
      </section>

      {notice && (
        <div className="bg-amber-500/20 border border-amber-500/60 p-3 rounded-xl mb-6 text-sm text-amber-300 flex items-center justify-between">
          <span>ℹ️ {notice}</span>
          <button onClick={() => setNotice(null)} className="text-amber-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded">Dismiss</button>
        </div>
      )}
      {error && <div className="bg-rose-500/20 border border-rose-500 p-4 rounded-xl mb-6 text-sm text-rose-300">⚠️ {error}</div>}

      {/* Main Roster Grid Module */}
      {loading && talentPool?.length === 0 ? (
        <div className="text-center py-20 text-slate-400 animate-pulse text-sm">Processing database matrix sequences...</div>
      ) : (
        <>
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-700 text-slate-400 font-bold text-xs tracking-wider uppercase">
                  <th className="p-4 w-12 text-center">Bench</th>
                  <th className="p-4">Creative Asset</th>
                  <th className="p-4">Discipline</th>
                  <th className="p-4">Audience Retention %</th>
                  <th className="p-4">Organic WOM (1-10)</th>
                  <th className="p-4">Rewrite Penalty</th>
                  <th className="p-4">IP Reliance</th>
                  <th className="p-4">Hiring Premium</th>
                  {undervaluedOnly && <th className="p-4 text-amber-400 font-bold">Value ROI</th>}
                  <th className="p-4 bg-emerald-950/40 text-emerald-400 font-black text-center">WAR Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {talentPool?.map((talent) => {
                  const isCompared = compareList.some(c => c.id === talent.id);
                  return (
                    <tr key={talent.id} className={`hover:bg-slate-700/20 transition-colors ${isCompared ? 'bg-sky-950/20 border-l-2 border-sky-400' : ''}`}>
                      <td className="p-4 text-center">
                        <input type="checkbox" checked={isCompared} onChange={() => toggleComparison(talent)}
                          className="w-4 h-4 accent-sky-400 cursor-pointer" />
                      </td>
                      <td className="p-4 font-semibold">{talent.name}</td>
                      <td className="p-4 text-slate-300">{talent.role}</td>
                      <td className="p-4">
                        <input type="number" min="0" max="1" step="0.01" value={talent.completion_rate ?? 0}
                          onChange={e => handleUpdateMetric(talent.id, 'completion_rate', e.target.value)}
                          className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                      </td>
                      <td className="p-4">
                        <input type="number" min="0" max="10" step="0.1" value={talent.word_of_mouth_score ?? 0}
                          onChange={e => handleUpdateMetric(talent.id, 'word_of_mouth_score', e.target.value)}
                          className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                      </td>
                      <td className="p-4">
                        <input type="number" min="0" max="1" step="0.01" value={talent.rewrite_ratio ?? 0}
                          onChange={e => handleUpdateMetric(talent.id, 'rewrite_ratio', e.target.value)}
                          className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                      </td>
                      <td className="p-4">
                        <input type="number" min="0" max="1" step="0.01" value={talent.ip_strength ?? 0}
                          onChange={e => handleUpdateMetric(talent.id, 'ip_strength', e.target.value)}
                          className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                      </td>
                      <td className="p-4 whitespace-nowrap">${talent.base_cost?.toLocaleString() ?? '0'}</td>
                      {undervaluedOnly && <td className="p-4 text-amber-400 font-bold">{talent.value_rating}x</td>}
                      <td className="p-4 bg-emerald-950/20 text-center text-emerald-400 font-black">{talent.creative_war}</td>
                    </tr>
                  );
                })}
                {talentPool?.length === 0 && !loading && (
                  <tr><td colSpan={undervaluedOnly ? 10 : 9} className="p-10 text-center text-slate-400">
                    No creative profiles match the filtered query parameters.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Table Footer Control Deck */}
          <div className="flex items-center justify-between mt-5 gap-4">
            <div className="text-sm text-slate-400">Page {currentPage} of {totalPages}</div>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-30 flex items-center gap-1 transition">
                <ChevronLeft size={14} /> Previous
              </button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-30 flex items-center gap-1 transition">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Head-to-Head Comparison Panel Engine Module */}
      {compareList.length > 0 && (
        <section className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black flex items-center gap-2"><Scale className="text-sky-400" /> Advanced Bench Comparison Matrix</h2>
            <button onClick={() => setCompareList([])} aria-label="Clear comparison"
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {compareList.map(asset => (
              <article key={asset.id} className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
                <div>
                  <h3 className="font-black text-lg text-white">{asset.name}</h3>
                  <div className="text-sm text-slate-400">{asset.role}</div>
                </div>
                <div className="text-sm text-slate-400">Hiring Cost
                  <div className="text-xl text-white font-bold">${asset.base_cost?.toLocaleString() ?? '0'}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Audience Retention Rate</span><b>{Math.round((asset.completion_rate ?? 0) * 100)}%</b></div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="bg-sky-400 h-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, (asset.completion_rate ?? 0) * 100))}%` }} />
                  </div>
                  <div className="flex justify-between text-sm"><span>Organic Word-of-Mouth (WOM Velocity)</span><b>{asset.word_of_mouth_score ?? 0} / 10</b></div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="bg-indigo-400 h-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, (asset.word_of_mouth_score ?? 0) * 10))}%` }} />
                  </div>
                  <div className="flex justify-between text-sm"><span>IP Reliance</span><b>{Math.round((asset.ip_strength ?? 0) * 100)}%</b></div>
                  <div className="flex justify-between text-sm"><span>Rewrite Variance</span><b>{Math.round((asset.rewrite_ratio ?? 0) * 100)}%</b></div>
                </div>
                <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
                  <div className="text-amber-400 font-bold">{asset.value_rating != null && `${asset.value_rating}x ROI Index`}</div>
                  <div className="text-emerald-400 font-black">{asset.creative_war} WAR</div>
                </div>
              </article>
            ))}
          </div>
          {compareList.length === 1 && (
            <p className="mt-4 text-center text-slate-400 text-sm">Select a second creator from the bench checkbox columns above to unlock full analytical comparison benchmarking.</p>
          )}
        </section>
      )}
    </div>
  );
}
