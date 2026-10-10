import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Search,
  Sparkles,
  Award,
  Zap,
  SlidersHorizontal,
  Flame,
  ArrowUpRight,
  Database,
  ExternalLink,
  Plus,
  Check,
  ShieldCheck,
  Filter,
  RefreshCw,
  Film,
  Target,
  BarChart2,
  DollarSign,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  Activity,
  UserCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  ImdbProspectRecord,
  ImdbSourceStatus,
  IMDB_ACTIVE_SOURCES,
  CURATED_UP_AND_COMING_TALENT,
  calculateTalentPrediction,
} from '../data/imdbDataSources';

interface ImdbProspectPredictorProps {
  onDraftTalent?: (talent: {
    id: string;
    name: string;
    role: string;
    completion_rate: number;
    word_of_mouth_score: number;
    rewrite_ratio: number;
    ip_strength: number;
    base_cost: number;
    creative_war: number;
    avatar_url?: string;
  }) => void;
  onOpenPlayerCard?: (talentName: string) => void;
}

export default function ImdbProspectPredictor({
  onDraftTalent,
  onOpenPlayerCard,
}: ImdbProspectPredictorProps) {
  // Navigation tabs within predictor
  const [activeTab, setActiveTab] = useState<'pipeline' | 'simulator' | 'sources'>('pipeline');

  // Prospect list state
  const [prospects, setProspects] = useState<ImdbProspectRecord[]>(CURATED_UP_AND_COMING_TALENT);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<ImdbProspectRecord>(CURATED_UP_AND_COMING_TALENT[0]);

  // Filters
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'bvi' | 'starmeter' | 'war3' | 'surplus' | 'probability'>('bvi');
  const [draftedIds, setDraftedIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  // Live IMDb search state
  const [liveSearchQuery, setLiveSearchQuery] = useState('');
  const [liveSearchResults, setLiveSearchResults] = useState<ImdbProspectRecord[]>([]);
  const [searchingLive, setSearchingLive] = useState(false);

  // Interactive Simulator state
  const [simName, setSimName] = useState('New Indie Prospect');
  const [simRole, setSimRole] = useState<'Director' | 'Screenwriter'>('Director');
  const [simCurrentWar, setSimCurrentWar] = useState(7.5);
  const [simImdbRating, setSimImdbRating] = useState(7.8);
  const [simStarmeterRank, setSimStarmeterRank] = useState(85);
  const [simStarmeterChange, setSimStarmeterChange] = useState(180);
  const [simCompletionRate, setSimCompletionRate] = useState(0.85);
  const [simRewriteRatio, setSimRewriteRatio] = useState(0.04);
  const [simIpStrength, setSimIpStrength] = useState(0.0);
  const [simBaseCost, setSimBaseCost] = useState(275000);
  const [simFestivalBoost, setSimFestivalBoost] = useState(1.0); // 0.0 to 1.5

  // Fetch prospects from backend API if available
  useEffect(() => {
    async function loadProspects() {
      setLoadingProspects(true);
      try {
        const res = await fetch(`/api/imdb/prospects?sort_by=${sortBy}`);
        if (res.ok) {
          const data = await res.json();
          if (data.prospects && data.prospects.length > 0) {
            setProspects(data.prospects);
            if (!selectedProspect) setSelectedProspect(data.prospects[0]);
          }
        }
      } catch (err) {
        console.warn('Using local curated prospects fallback:', err);
      } finally {
        setLoadingProspects(false);
      }
    }
    loadProspects();
  }, [sortBy]);

  // Handle live search
  useEffect(() => {
    if (!liveSearchQuery.trim()) {
      setLiveSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingLive(true);
      try {
        const res = await fetch(`/api/imdb/search?q=${encodeURIComponent(liveSearchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setLiveSearchResults(data.results || []);
        }
      } catch (err) {
        console.error('Error searching IMDb live:', err);
      } finally {
        setSearchingLive(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [liveSearchQuery]);

  // Filtered prospects
  const filteredProspects = prospects.filter((p) => {
    if (stageFilter !== 'all' && p.breakout_stage !== stageFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchRole = p.role.toLowerCase().includes(q);
      const matchComp = p.star_archetype_comp.toLowerCase().includes(q);
      const matchTitles = p.known_for_titles.some((t) => t.title.toLowerCase().includes(q));
      if (!matchName && !matchRole && !matchComp && !matchTitles) return false;
    }
    return true;
  });

  // Simulator computed output
  const simPrediction = calculateTalentPrediction({
    current_war: simCurrentWar,
    imdb_rating: simImdbRating,
    starmeter_rank: simStarmeterRank,
    starmeter_change: simStarmeterChange,
    completion_rate: simCompletionRate,
    rewrite_ratio: simRewriteRatio,
    ip_strength: simIpStrength,
    base_cost: simBaseCost,
    festival_boost: simFestivalBoost,
  });

  // 3-Year Projection Chart Data
  const trajectoryChartData = [
    { year: 'Current', war: selectedProspect.current_war, ceiling: selectedProspect.current_war + 0.8, floor: Math.max(1.5, selectedProspect.current_war - 0.5) },
    { year: 'Year +1', war: selectedProspect.projected_war_year1, ceiling: selectedProspect.projected_war_year1 + 1.6, floor: Math.max(2.0, selectedProspect.projected_war_year1 - 1.0) },
    { year: 'Year +2', war: selectedProspect.projected_war_year2, ceiling: selectedProspect.projected_war_year2 + 2.4, floor: Math.max(2.5, selectedProspect.projected_war_year2 - 1.5) },
    { year: 'Year +3', war: selectedProspect.projected_war_year3, ceiling: selectedProspect.projected_war_year3 + 3.2, floor: Math.max(3.0, selectedProspect.projected_war_year3 - 2.0) },
  ];

  const simChartData = [
    { year: 'Current', war: simCurrentWar, ceiling: simCurrentWar + 0.8, floor: Math.max(1.5, simCurrentWar - 0.5) },
    { year: 'Year +1', war: simPrediction.projected_war_year1, ceiling: simPrediction.projected_war_year1 + 1.5, floor: Math.max(2.0, simPrediction.projected_war_year1 - 1.0) },
    { year: 'Year +2', war: simPrediction.projected_war_year2, ceiling: simPrediction.projected_war_year2 + 2.5, floor: Math.max(2.5, simPrediction.projected_war_year2 - 1.4) },
    { year: 'Year +3', war: simPrediction.projected_war_year3, ceiling: simPrediction.projected_war_year3 + 3.4, floor: Math.max(3.0, simPrediction.projected_war_year3 - 1.8) },
  ];

  const handleDraftProspect = async (prospect: ImdbProspectRecord) => {
    try {
      const res = await fetch('/api/imdb/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospect.id,
          name: prospect.name,
          role: prospect.role.includes('Director') ? 'Director' : 'Screenwriter',
          base_cost: prospect.base_cost,
          completion_rate: prospect.completion_rate,
          word_of_mouth_score: prospect.word_of_mouth_score,
          rewrite_ratio: prospect.rewrite_ratio,
          ip_strength: prospect.ip_strength,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDraftedIds((prev) => new Set(prev).add(prospect.id));
        setNotice(data.message || `Drafted ${prospect.name} into studio database!`);
        setTimeout(() => setNotice(null), 4000);

        if (onDraftTalent) {
          onDraftTalent({
            id: prospect.id,
            name: prospect.name,
            role: prospect.role.includes('Director') ? 'Director' : 'Screenwriter',
            completion_rate: prospect.completion_rate,
            word_of_mouth_score: prospect.word_of_mouth_score,
            rewrite_ratio: prospect.rewrite_ratio,
            ip_strength: prospect.ip_strength,
            base_cost: prospect.base_cost,
            creative_war: prospect.current_war,
            avatar_url: prospect.avatar_url,
          });
        }
      }
    } catch (err) {
      console.error('Failed to draft prospect:', err);
      // Client fallback
      setDraftedIds((prev) => new Set(prev).add(prospect.id));
      setNotice(`Added ${prospect.name} to active lineup roster!`);
      setTimeout(() => setNotice(null), 4000);
      if (onDraftTalent) {
        onDraftTalent({
          id: prospect.id,
          name: prospect.name,
          role: prospect.role.includes('Director') ? 'Director' : 'Screenwriter',
          completion_rate: prospect.completion_rate,
          word_of_mouth_score: prospect.word_of_mouth_score,
          rewrite_ratio: prospect.rewrite_ratio,
          ip_strength: prospect.ip_strength,
          base_cost: prospect.base_cost,
          creative_war: prospect.current_war,
          avatar_url: prospect.avatar_url,
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {notice && (
        <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircleIcon />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Header & Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded text-xs tracking-wider uppercase">
                IMDb Live Data Engine
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                <Activity size={12} className="animate-pulse" />
                Real-Time Feeds Active
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Sparkles className="text-amber-400" size={22} />
              Up & Coming Talent Predictive Engine
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Synthesizing live IMDb StarMeter rank momentum, user rating trends, indie festival acquisitions,
              and Sabermetric context lift to forecast 3-year creative WAR trajectory and high-surplus talent breakouts.
            </p>
          </div>

          {/* Sub Navigation Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'pipeline'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target size={14} /> Breakout Prospect Draft Board
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'simulator'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal size={14} /> Trajectory Simulator
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'sources'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database size={14} /> IMDb & Box Office Feeds ({IMDB_ACTIVE_SOURCES.length})
            </button>
          </div>
        </div>

        {/* Live Metric Tickers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-slate-400 font-medium">Top StarMeter Mover</div>
            <div className="text-white font-black text-sm flex items-center gap-1 mt-0.5">
              <span>Sean Baker</span>
              <span className="text-emerald-400 text-[11px] font-mono flex items-center">
                <ArrowUp size={11} />#18 (+340)
              </span>
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-slate-400 font-medium">Avg Breakout Velocity</div>
            <div className="text-amber-400 font-black text-sm mt-0.5 font-mono">
              92.8 / 100 BVI
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-slate-400 font-medium">Top Box Office ROI Prospect</div>
            <div className="text-white font-black text-sm flex items-center gap-1 mt-0.5">
              <span>Philippou Bros</span>
              <span className="text-emerald-400 text-[11px] font-mono">20.5x Gross</span>
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-slate-400 font-medium">Total Pipeline Surplus</div>
            <div className="text-emerald-400 font-black text-sm mt-0.5 font-mono">
              +$38.5M Net Arbitrage
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: PROSPECT PIPELINE DRAFT BOARD */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
              {/* Search input */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
                <input
                  type="text"
                  placeholder="Search prospects, titles, or comps (e.g. Celine Song, Barbarian)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Stage Filter */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Breakout Stages</option>
                <option value="High-Ceiling Prospect">High-Ceiling Prospect</option>
                <option value="Ascending Breakout">Ascending Breakout</option>
                <option value="Proven Rising Star">Proven Rising Star</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="bvi">Sort: Breakout Velocity (BVI)</option>
                <option value="starmeter">Sort: Top IMDb StarMeter Rank</option>
                <option value="war3">Sort: Highest 3-Yr Projected WAR</option>
                <option value="surplus">Sort: Maximum Studio Surplus ($)</option>
                <option value="probability">Sort: Breakout Probability %</option>
              </select>
            </div>

            <div className="text-xs text-slate-400 font-semibold">
              Showing <span className="text-white font-bold">{filteredProspects.length}</span> scouted prospects
            </div>
          </div>

          {/* Main 2-Column Split: Prospect List + Deep Predictive Radar Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Prospect Cards Grid (7 cols) */}
            <div className="lg:col-span-7 space-y-3.5">
              {filteredProspects.map((prospect) => {
                const isSelected = selectedProspect.id === prospect.id;
                const isDrafted = draftedIds.has(prospect.id);

                return (
                  <div
                    key={prospect.id}
                    onClick={() => setSelectedProspect(prospect)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/50'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Avatar & Core Bio */}
                      <div className="flex items-start gap-3.5 flex-1">
                        <div className="relative">
                          <img
                            src={prospect.avatar_url}
                            alt={prospect.name}
                            className="w-14 h-14 rounded-xl object-cover border-2 border-slate-800 shadow"
                          />
                          <span
                            className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1 rounded shadow"
                            title="IMDb Verified Prospect"
                          >
                            IMDb
                          </span>
                        </div>

                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-white text-base hover:text-amber-400 transition">
                              {prospect.name}
                            </h3>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300">
                              {prospect.role}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                prospect.breakout_stage === 'Proven Rising Star'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : prospect.breakout_stage === 'Ascending Breakout'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              }`}
                            >
                              {prospect.breakout_stage}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1 font-semibold text-amber-300">
                              ★ {prospect.imdb_rating_avg} IMDb avg
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="flex items-center gap-1 text-emerald-400 font-mono font-medium">
                              <ArrowUp size={12} /> StarMeter #{prospect.starmeter_rank} (+{prospect.starmeter_change})
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-300">
                              RT: <strong className="text-white">{prospect.rotten_tomatoes_fresh}%</strong>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-300">
                              MC: <strong className="text-white">{prospect.metacritic_avg}</strong>
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-1 pt-0.5">
                            {prospect.bio}
                          </p>
                        </div>
                      </div>

                      {/* Right Action & Prediction Badge */}
                      <div className="text-right space-y-1.5 flex flex-col items-end">
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-lg text-xs font-mono font-black">
                          {prospect.breakout_velocity_index} BVI
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          3-Yr: <strong className="text-emerald-400">{prospect.projected_war_year3} WAR</strong>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDraftProspect(prospect);
                          }}
                          disabled={isDrafted}
                          className={`mt-1 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                            isDrafted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                              : 'bg-slate-800 text-white hover:bg-amber-500 hover:text-slate-950 border border-slate-700'
                          }`}
                        >
                          {isDrafted ? (
                            <>
                              <Check size={12} /> Drafted
                            </>
                          ) : (
                            <>
                              <Plus size={12} /> Draft Talent
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Bottom strip: Titles & Historical Comp */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Known for:</span>
                        {prospect.known_for_titles.map((t, idx) => (
                          <span key={idx} className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                            {t.title} ({t.year}) ★ {t.imdb_rating}
                          </span>
                        ))}
                      </div>

                      <div className="font-semibold text-slate-400">
                        Comp: <span className="text-indigo-300 font-normal">{prospect.star_archetype_comp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Deep Predictive Intelligence Panel (5 cols) */}
            <div className="lg:col-span-5 space-y-5 sticky top-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
                {/* Header with Selected Prospect */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedProspect.avatar_url}
                      alt={selectedProspect.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/50 shadow-md"
                    />
                    <div>
                      <div className="text-xs text-amber-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                        <Award size={12} /> Predictive Prospect File
                      </div>
                      <h3 className="text-lg font-black text-white">{selectedProspect.name}</h3>
                      <div className="text-xs text-slate-400">{selectedProspect.role} • IMDb ID: {selectedProspect.imdb_id}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDraftProspect(selectedProspect)}
                    className="bg-emerald-500 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs hover:bg-emerald-400 transition flex items-center gap-1.5 shadow"
                  >
                    <UserCheck size={14} /> Draft to Studio
                  </button>
                </div>

                {/* 3-Year Projected WAR Curve Chart */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-emerald-400" />
                      3-Year Creative WAR Trajectory
                    </span>
                    <span className="text-emerald-400 font-mono font-bold">
                      +{((selectedProspect.projected_war_year3 - selectedProspect.current_war) / Math.max(0.1, selectedProspect.current_war) * 100).toFixed(0)}% Growth
                    </span>
                  </div>

                  <div className="h-44 w-full bg-slate-950/60 rounded-xl p-2 border border-slate-800">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trajectoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="prospectWarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="prospectCeilingGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="year" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} domain={[0, 20]} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            fontSize: '11px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="ceiling"
                          stroke="#f59e0b"
                          strokeDasharray="3 3"
                          fill="url(#prospectCeilingGrad)"
                          name="Ceiling Scenario"
                        />
                        <Area
                          type="monotone"
                          dataKey="war"
                          stroke="#10b981"
                          strokeWidth={3}
                          fill="url(#prospectWarGrad)"
                          name="Projected WAR"
                        />
                        <ReferenceLine y={5.1} stroke="#475569" strokeDasharray="2 2" label={{ value: 'League Avg 5.1', fill: '#64748b', fontSize: 10 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quantitative Metric Grids */}
                <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-[11px] font-sans">Breakout Probability</div>
                    <div className="text-emerald-400 font-bold text-base mt-0.5">
                      {selectedProspect.breakout_probability_pct}% Odds
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-[11px] font-sans">Projected Studio Surplus</div>
                    <div className="text-amber-400 font-bold text-base mt-0.5">
                      +${(selectedProspect.projected_surplus_value / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-[11px] font-sans">Current Contract Cap</div>
                    <div className="text-slate-200 font-bold text-base mt-0.5">
                      ${(selectedProspect.base_cost / 1000).toFixed(0)}k
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-[11px] font-sans">Risk / Floor Volatility</div>
                    <div className="text-indigo-400 font-bold text-xs mt-1.5 font-sans">
                      {selectedProspect.risk_profile}
                    </div>
                  </div>
                </div>

                {/* Festival Acclaim & Awards */}
                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    Festival Pedigree & Industry Accolades
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProspect.festival_awards.map((award, idx) => (
                      <span key={idx} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-md text-[11px]">
                        ★ {award}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Executive Recommendation Box */}
                <div className="bg-slate-950/90 border border-indigo-500/30 rounded-xl p-3.5 space-y-1 text-xs">
                  <div className="text-indigo-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <ShieldCheck size={13} /> Scouting Recommendation
                  </div>
                  <p className="text-slate-200 font-medium leading-relaxed">
                    {selectedProspect.recommendation_action}
                  </p>
                  <div className="text-slate-400 text-[11px] pt-1">
                    Historical Superstar Archetype:{' '}
                    <strong className="text-white">{selectedProspect.star_archetype_comp}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE TRAJECTORY SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <SlidersHorizontal className="text-amber-400" size={20} />
                Prospect Breakout Trajectory Simulator
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Test predictive scenarios for upcoming talent: adjust their current IMDb audience reception,
                StarMeter acceleration, festival bidding wars, and production discipline to project their 3-year WAR arc and financial surplus.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Sliders Input Deck (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Profile Identity Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Prospect Name</label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Discipline</label>
                    <select
                      value={simRole}
                      onChange={(e) => setSimRole(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Director">Director</option>
                      <option value="Screenwriter">Screenwriter</option>
                    </select>
                  </div>
                </div>

                {/* Slider 1: IMDb Audience Rating */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1">
                      IMDb Average Rating (Recent Releases)
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{simImdbRating.toFixed(1)} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="9.5"
                    step="0.1"
                    value={simImdbRating}
                    onChange={(e) => setSimImdbRating(parseFloat(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>5.0 (Mixed reception)</span>
                    <span>7.5 (Festival breakout)</span>
                    <span>9.0+ (Historic classic)</span>
                  </div>
                </div>

                {/* Slider 2: StarMeter Ranking */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1">
                      IMDb StarMeter Ranking & Momentum
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      #{simStarmeterRank} (+{simStarmeterChange} rise)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    step="5"
                    value={simStarmeterRank}
                    onChange={(e) => setSimStarmeterRank(parseInt(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Top 10 (A-List Attention)</span>
                    <span>#150 (Rising Indie Sensation)</span>
                    <span>#500 (Early Discovery)</span>
                  </div>
                </div>

                {/* Slider 3: Current Creative WAR Baseline */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold">Current Sabermetric WAR Baseline</span>
                    <span className="font-mono text-cyan-400 font-bold">{simCurrentWar.toFixed(1)} WAR</span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="15.0"
                    step="0.5"
                    value={simCurrentWar}
                    onChange={(e) => setSimCurrentWar(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Slider 4: Festival & Critics Buzz Boost */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold">Festival Acquisition & Bidding War Boost</span>
                    <span className="font-mono text-purple-400 font-bold">
                      {simFestivalBoost === 0 ? 'None' : simFestivalBoost < 0.8 ? 'Official Selection' : 'Grand Jury / Palme d\'Or'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.25"
                    value={simFestivalBoost}
                    onChange={(e) => setSimFestivalBoost(parseFloat(e.target.value))}
                    className="w-full accent-purple-400"
                  />
                </div>

                {/* Slider 5: Contract Hiring Cap */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold">Base Contract Hiring Cap ($)</span>
                    <span className="font-mono text-emerald-400 font-bold">${(simBaseCost / 1000).toFixed(0)}k</span>
                  </div>
                  <input
                    type="range"
                    min="75000"
                    max="1000000"
                    step="25000"
                    value={simBaseCost}
                    onChange={(e) => setSimBaseCost(parseInt(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>

              {/* Simulation Result Output & Live Projection Graph (5 cols) */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
                      Simulated Forecast
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">{simName}</h4>
                    <span className="text-xs text-slate-400">{simRole}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">BVI Score</div>
                    <div className="text-xl font-mono font-black text-amber-400">
                      {simPrediction.breakout_velocity_index} / 100
                    </div>
                  </div>
                </div>

                {/* Projected Graph */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300 flex justify-between">
                    <span>Forecasted WAR Curve</span>
                    <span className="text-emerald-400 font-mono">
                      Y+3: {simPrediction.projected_war_year3} WAR
                    </span>
                  </div>
                  <div className="h-44 w-full bg-slate-900/60 rounded-xl p-2 border border-slate-800">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={simChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="year" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} domain={[0, 22]} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            fontSize: '11px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="ceiling"
                          stroke="#f59e0b"
                          strokeDasharray="3 3"
                          fill="#f59e0b"
                          fillOpacity={0.1}
                          name="Ceiling Scenario"
                        />
                        <Area
                          type="monotone"
                          dataKey="war"
                          stroke="#10b981"
                          strokeWidth={3}
                          fill="#10b981"
                          fillOpacity={0.2}
                          name="Predicted WAR"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[11px] font-sans">Breakout Odds</div>
                    <div className="text-emerald-400 font-bold text-sm mt-0.5">
                      {simPrediction.breakout_probability_pct}%
                    </div>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[11px] font-sans">Projected Surplus</div>
                    <div className="text-amber-400 font-bold text-sm mt-0.5">
                      +${(simPrediction.projected_surplus_value / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Projected Comp Profile</div>
                  <div className="font-bold text-indigo-300 mt-0.5">{simPrediction.star_archetype_comp}</div>
                </div>

                <button
                  onClick={() => {
                    if (onDraftTalent) {
                      onDraftTalent({
                        id: `sim-${Date.now()}`,
                        name: simName,
                        role: simRole,
                        completion_rate: simCompletionRate,
                        word_of_mouth_score: (simImdbRating - 5.0) * 2,
                        rewrite_ratio: simRewriteRatio,
                        ip_strength: simIpStrength,
                        base_cost: simBaseCost,
                        creative_war: simCurrentWar,
                      });
                      setNotice(`Drafted custom simulated talent "${simName}" into active lineup!`);
                      setTimeout(() => setNotice(null), 4000);
                    }
                  }}
                  className="w-full bg-amber-500 text-slate-950 font-black py-2.5 rounded-xl text-xs hover:bg-amber-400 transition flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <Plus size={14} /> Draft Simulated Prospect to Lineup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IMDB ACTIVE SOURCES & LIVE SEARCH HUB */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          {/* Live Search Across IMDb Ecosystem */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Search className="text-amber-400" size={18} />
              Live IMDb Creator & Filmography Lookup
            </h3>
            <p className="text-xs text-slate-400">
              Query any creator by name or IMDb nm-identifier. Inspect real-time StarMeter rankings, user voting velocity, and instant breakout scores.
            </p>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search any creator (e.g., Greta Gerwig, Sean Baker, Jordan Peele, Charlotte Wells)..."
                value={liveSearchQuery}
                onChange={(e) => setLiveSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-medium"
              />
              {searchingLive && (
                <div className="absolute right-3.5 top-3">
                  <RefreshCw size={15} className="text-amber-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Live Search Results */}
            {liveSearchResults.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs text-slate-400 font-semibold">
                  Found {liveSearchResults.length} matching creators with live IMDb metrics:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {liveSearchResults.map((res) => (
                    <div
                      key={res.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={res.avatar_url}
                          alt={res.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-800"
                        />
                        <div>
                          <div className="font-bold text-white text-sm">{res.name}</div>
                          <div className="text-xs text-slate-400">{res.role} • StarMeter #{res.starmeter_rank}</div>
                          <div className="text-xs text-amber-400 font-mono font-semibold">★ {res.imdb_rating_avg} IMDb avg</div>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-xs font-mono font-bold text-emerald-400">{res.breakout_velocity_index} BVI</div>
                        <button
                          onClick={() => handleDraftProspect(res)}
                          className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition"
                        >
                          Draft
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Connectors Health Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Database size={15} className="text-amber-400" />
              Active Telemetry & Industry Data Feeds
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {IMDB_ACTIVE_SOURCES.map((source, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-sm leading-tight flex-1">
                      {source.connector_name}
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold ml-2">
                      {source.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {source.coverage_description}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <div>
                      Indexed: <strong className="text-white">{source.records_indexed.toLocaleString()}</strong>
                    </div>
                    <div>
                      Latency: <strong className="text-emerald-400">{source.latency_ms}ms</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
