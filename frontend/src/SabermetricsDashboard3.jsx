import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, TrendingUp, DollarSign, Award, ChevronLeft, ChevronRight, Zap, Scale, X } from 'lucide-react';

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

  const fetchTalent = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:8000/talent/';
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
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, maxCostFilter, undervaluedOnly, searchTerm]);

  useEffect(() => {
    fetchTalent();
  }, [currentPage, roleFilter, maxCostFilter, undervaluedOnly, searchTerm]);

  const handleUpdateMetric = async (id, field, value) => {
    const parsedValue = value === '' ? 0 : parseFloat(value);
    setTalentPool(prev => prev.map(t => t.id === id ? { ...t, [field]: parsedValue } : t));

    try {
      const response = await fetch(`http://localhost:8000/talent/${id}`, {
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
        alert("You can compare a maximum of 2 creative assets side-by-side.");
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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
            <DollarSign className="absolute left-2.5 text-slate-500" size={14} />
            <input 
              type="number"
              placeholder="Max Contract Cap"
              className="bg-slate-900 border border-slate-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 w-36"
              value={maxCostFilter}
              onChange={(e) => setMaxCostFilter(e.target.value)}
            />
          </div>
        </div>

        {/* The Undervalued "Moneyball" Asset Finder Toggle */}
        <button
          onClick={() => setUndervaluedOnly(prev => !prev)}
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
                        <input 
                          type="checkbox"
                          checked={isCompared}
                          onChange={() => toggleComparison(talent)}
                          className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-600 accent-sky-400 cursor-pointer"
                        />
                      </td>
{talent.name}
${talent.base_cost?.toLocaleString()}
{undervaluedOnly && (
{talent.value_rating}x
)}
);
})}

{talentPool?.length === 0 && !loading && (
No creative profiles match the filtered query parameters.
)}
{/* Table Footer Control Deck */}


Page {currentPage} of {totalPages}


<button
onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
disabled={currentPage === 1 || loading}
className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 flex items-center gap-1 transition"
>
 Previous

<button
onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
disabled={currentPage === totalPages || loading}
className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 flex items-center gap-1 transition"
>
Next 



</>
)}
{/* Head-to-Head Comparison Panel Engine Module */}
{compareList.length > 0 && (
 Advanced Bench Comparison Matrix

<button
onClick={() => setCompareList([])}
className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
>


{compareList.map((asset) => (



{asset.name}
{asset.role}


Hiring Cost
${asset.base_cost?.toLocaleString()}

{/* Data Visualisation Ratios */}



Audience Retention Rate
{Math.round(asset.completion_rate * 100)}%


<div className="bg-sky-400 h-full transition-all duration-500" style={{ width: ${asset.completion_rate * 100}% }}>

Organic Word-of-Mouth (WOM Velocity)
{asset.word_of_mouth_score} / 10


<div className="bg-indigo-400 h-full transition-all duration-500" style={{ width: ${asset.word_of_mouth_score * 10}% }}>

IP Reliance
{Math.round(asset.ip_strength * 100)}%


Rewrite Variance
{Math.round(asset.rewrite_ratio * 100)}%


{/* Absolute Target Metric Yield Footers */}


{asset.value_rating && (

{asset.value_rating}x ROI Index

)}


 {asset.creative_war} WAR



))}
{compareList.length === 1 && (

Select a second creator from the bench checkbox columns above to unlock full analytical comparison benchmarking.

)}



)}

);
}