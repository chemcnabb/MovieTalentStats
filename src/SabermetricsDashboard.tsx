import { useState, useEffect, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import {
  Award,
  Search,
  SlidersHorizontal,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Zap,
  Scale,
  X,
  Plus,
  Download,
  BookOpen,
  TrendingUp,
  User,
  RefreshCw,
  Check,
  BarChart3,
  Flame,
  ArrowUpDown,
  Database,
  UploadCloud,
  FileText,
  Code,
  ExternalLink,
  Copy,
  Star,
  Target,
  Users,
  Sparkles,
  Layers,
} from 'lucide-react';

interface Talent {
  id: string;
  name: string;
  role: string;
  completion_rate: number;
  word_of_mouth_score: number;
  rewrite_ratio: number;
  ip_strength: number;
  base_cost: number;
  creative_war: number;
  value_rating: number;
  x_engagement?: number;
  context_lift?: number;
  efficiency_score?: number;
  replacement_delta?: number;
  cost_per_war?: number;
  surplus_value?: number;
  hidden_talent_index?: number;
  similarity_pct?: number;
}

interface SummaryStats {
  total_creators: number;
  avg_war: number;
  avg_cost: number;
  undervalued_count: number;
  disciplines: {
    screenwriters: number;
    directors: number;
    novelists: number;
  };
}

export default function SabermetricsDashboard() {
  // Main view mode: matrix, scatter, sleepers, lineup
  const [viewMode, setViewMode] = useState<'matrix' | 'scatter' | 'sleepers' | 'lineup'>('matrix');

  // Talent data & pagination
  const [talentPool, setTalentPool] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryStats | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [maxCostFilter, setMaxCostFilter] = useState('');
  const [minWarFilter, setMinWarFilter] = useState('');
  const [undervaluedOnly, setUndervaluedOnly] = useState(false);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [sortBy, setSortBy] = useState('war');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [activePreset, setActivePreset] = useState<string>('all');

  // Watchlist (Starred Bookmarks)
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sabermetrics_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Formula Weight Sandbox
  const [showFormulaDrawer, setShowFormulaDrawer] = useState(false);
  const [formulaWeights, setFormulaWeights] = useState({
    engagementMultiplier: 10.0,
    ipDiscountFactor: 0.5,
    efficiencyPenalty: 3.0,
  });

  // Modals & Panels
  const [compareList, setCompareList] = useState<Talent[]>([]);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [talentComps, setTalentComps] = useState<Talent[]>([]);
  const [loadingComps, setLoadingComps] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [pipelineTab, setPipelineTab] = useState<'upload' | 'simulate' | 'script' | 'formulas'>('upload');

  // Scatter plot data
  const [scatterData, setScatterData] = useState<Talent[]>([]);
  const [loadingScatter, setLoadingScatter] = useState(false);
  const [hoveredScatterItem, setHoveredScatterItem] = useState<Talent | null>(null);

  // Lineup Builder State
  const [lineupWriter, setLineupWriter] = useState<Talent | null>(null);
  const [lineupDirector, setLineupDirector] = useState<Talent | null>(null);
  const [lineupCap, setLineupCap] = useState(1000000);

  // New Prospect Draft Form State
  const [draftForm, setDraftForm] = useState({
    name: '',
    role: 'Screenwriter',
    completion_rate: 0.75,
    word_of_mouth_score: 6.5,
    rewrite_ratio: 0.1,
    ip_strength: 0.0,
    base_cost: 95000,
  });
  const [draftSubmitting, setDraftSubmitting] = useState(false);

  // Player Card Editing State
  const [playerEditState, setPlayerEditState] = useState<Partial<Talent>>({});
  const [savingPlayer, setSavingPlayer] = useState(false);

  // Pipeline simulation state
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Save watchlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sabermetrics_watchlist', JSON.stringify(watchlist));
    } catch {
      // Non-blocking
    }
  }, [watchlist]);

  const toggleWatchlist = (id: string) => {
    setWatchlist((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Fetch summary stats
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/talent/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Fetch scatter plot dataset
  const fetchScatterData = useCallback(async () => {
    setLoadingScatter(true);
    try {
      const params = new URLSearchParams();
      if (formulaWeights.engagementMultiplier !== 10.0) {
        params.append('weight_engagement', formulaWeights.engagementMultiplier.toString());
      }
      if (formulaWeights.ipDiscountFactor !== 0.5) {
        params.append('ip_discount', formulaWeights.ipDiscountFactor.toString());
      }
      if (formulaWeights.efficiencyPenalty !== 3.0) {
        params.append('efficiency_penalty', formulaWeights.efficiencyPenalty.toString());
      }

      const res = await fetch(`/talent/scatter-sample?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setScatterData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingScatter(false);
    }
  }, [formulaWeights]);

  useEffect(() => {
    if (viewMode === 'scatter') {
      fetchScatterData();
    }
  }, [viewMode, fetchScatterData]);

  // Main fetch query
  const fetchTalent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (roleFilter) params.append('role', roleFilter);
      if (maxCostFilter) params.append('max_cost', maxCostFilter);
      if (minWarFilter) params.append('min_war', minWarFilter);
      if (undervaluedOnly) params.append('undervalued_only', 'true');
      params.append('sort_by', sortBy);
      params.append('sort_dir', sortDir);
      params.append('page', currentPage.toString());
      params.append('page_size', pageSize.toString());

      if (formulaWeights.engagementMultiplier !== 10.0) {
        params.append('weight_engagement', formulaWeights.engagementMultiplier.toString());
      }
      if (formulaWeights.ipDiscountFactor !== 0.5) {
        params.append('ip_discount', formulaWeights.ipDiscountFactor.toString());
      }
      if (formulaWeights.efficiencyPenalty !== 3.0) {
        params.append('efficiency_penalty', formulaWeights.efficiencyPenalty.toString());
      }

      const response = await fetch(`/talent/?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to query Sabermetrics scouting database');

      const data = await response.json();
      let items = data.items || [];
      if (showWatchlistOnly) {
        items = items.filter((t: Talent) => watchlist.includes(t.id));
      }

      setTalentPool(items);
      setTotalPages(data.total_pages || 1);
      setTotalCount(showWatchlistOnly ? items.length : data.total_count || 0);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while querying records.');
      }
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    searchTerm,
    roleFilter,
    maxCostFilter,
    minWarFilter,
    undervaluedOnly,
    showWatchlistOnly,
    watchlist,
    sortBy,
    sortDir,
    formulaWeights,
    pageSize,
  ]);

  useEffect(() => {
    fetchTalent();
  }, [fetchTalent]);

  // Inline PATCH update handler
  const handleUpdateMetric = async (id: string, field: keyof Talent, rawValue: string | number) => {
    const parsedValue = rawValue === '' ? 0 : parseFloat(rawValue.toString());
    setTalentPool((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: parsedValue } : t))
    );

    try {
      const response = await fetch(`/talent/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: parsedValue }),
      });
      if (!response.ok) throw new Error('Failed syncing metrics downstream');
      const updated = await response.json();
      setTalentPool((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setCompareList((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      if (selectedTalent?.id === id) {
        setSelectedTalent(updated);
        setPlayerEditState(updated);
      }
    } catch (err) {
      console.error(err);
      fetchTalent();
    }
  };

  // Toggle comparison item
  const toggleComparison = (talent: Talent) => {
    if (compareList.find((c) => c.id === talent.id)) {
      setCompareList((prev) => prev.filter((c) => c.id !== talent.id));
    } else {
      if (compareList.length >= 2) {
        setNotice('Head-to-head comparison supports a maximum of 2 creative assets side-by-side.');
        setTimeout(() => setNotice(null), 4000);
        return;
      }
      setCompareList((prev) => [...prev, talent]);
    }
  };

  // Preset Filters
  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    setCurrentPage(1);
    setShowWatchlistOnly(false);

    if (presetKey === 'all') {
      setRoleFilter('');
      setMaxCostFilter('');
      setMinWarFilter('');
      setUndervaluedOnly(false);
      setSortBy('war');
      setSortDir('desc');
    } else if (presetKey === 'moneyball') {
      setRoleFilter('');
      setMaxCostFilter('150000');
      setMinWarFilter('3.5');
      setUndervaluedOnly(true);
      setSortBy('value');
      setSortDir('desc');
    } else if (presetKey === 'hti_sleepers') {
      setRoleFilter('');
      setMaxCostFilter('200000');
      setMinWarFilter('3.0');
      setUndervaluedOnly(false);
      setSortBy('hti');
      setSortDir('desc');
    } else if (presetKey === 'finishers') {
      setRoleFilter('');
      setMaxCostFilter('');
      setMinWarFilter('4.0');
      setUndervaluedOnly(false);
      setSortBy('rewrite');
      setSortDir('asc');
    } else if (presetKey === 'viral') {
      setRoleFilter('');
      setMaxCostFilter('');
      setMinWarFilter('5.0');
      setUndervaluedOnly(false);
      setSortBy('wom');
      setSortDir('desc');
    } else if (presetKey === 'original_voices') {
      setRoleFilter('');
      setMaxCostFilter('');
      setMinWarFilter('3.0');
      setUndervaluedOnly(false);
      setSortBy('ip');
      setSortDir('asc');
    } else if (presetKey === 'all_stars') {
      setRoleFilter('');
      setMaxCostFilter('');
      setMinWarFilter('10.0');
      setUndervaluedOnly(false);
      setSortBy('war');
      setSortDir('desc');
    }
  };

  // Fetch Comps for selected creator
  const fetchComps = useCallback(async (talentId: string) => {
    setLoadingComps(true);
    try {
      const res = await fetch(`/talent/${talentId}/comps`);
      if (res.ok) {
        const data = await res.json();
        setTalentComps(data);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingComps(false);
    }
  }, []);

  // Open Player Card
  const openPlayerCard = (talent: Talent) => {
    setSelectedTalent(talent);
    setPlayerEditState({ ...talent });
    fetchComps(talent.id);
  };

  // Save Player Card metrics
  const savePlayerMetrics = async () => {
    if (!selectedTalent) return;
    setSavingPlayer(true);
    try {
      const response = await fetch(`/talent/${selectedTalent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerEditState),
      });
      if (!response.ok) throw new Error('Failed to update talent card');
      const updated = await response.json();
      setSelectedTalent(updated);
      setPlayerEditState(updated);
      setTalentPool((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setNotice(`Updated scouting card for ${updated.name}`);
      setTimeout(() => setNotice(null), 3000);
      fetchComps(updated.id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setNotice(`⚠️ ${err.message}`);
      }
    } finally {
      setSavingPlayer(false);
    }
  };

  // Draft new prospect submit
  const handleDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftForm.name.trim()) return;
    setDraftSubmitting(true);
    try {
      const response = await fetch('/talent/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftForm),
      });
      if (!response.ok) throw new Error('Failed to draft new prospect');
      const newTalent = await response.json();
      setTalentPool((prev) => [newTalent, ...prev]);
      setShowDraftModal(false);
      setNotice(`Successfully scouted and drafted ${newTalent.name} into the database!`);
      setTimeout(() => setNotice(null), 4000);
      setDraftForm({
        name: '',
        role: 'Screenwriter',
        completion_rate: 0.75,
        word_of_mouth_score: 6.5,
        rewrite_ratio: 0.1,
        ip_strength: 0.0,
        base_cost: 95000,
      });
      fetchSummary();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setNotice(`⚠️ ${err.message}`);
      }
    } finally {
      setDraftSubmitting(false);
    }
  };

  // CSV Export for front office scouting meeting
  const exportScoutingReport = () => {
    if (talentPool.length === 0) return;
    const headers = [
      'ID',
      'Name',
      'Role',
      'Audience Retention %',
      'Organic WOM Velocity',
      'Rewrite Penalty Ratio',
      'IP Reliance Strength',
      'Base Hiring Cost',
      'Creative WAR',
      'Value ROI Index',
      'Cost per WAR ($)',
      'Surplus Value ($)',
      'Hidden Talent Index',
    ];
    const rows = talentPool.map((t) => [
      t.id,
      `"${t.name.replace(/"/g, '""')}"`,
      t.role,
      (t.completion_rate * 100).toFixed(1),
      t.word_of_mouth_score.toFixed(1),
      (t.rewrite_ratio * 100).toFixed(1),
      (t.ip_strength * 100).toFixed(1),
      t.base_cost,
      t.creative_war,
      t.value_rating,
      t.cost_per_war ?? Math.round(t.base_cost / Math.max(0.1, t.creative_war)),
      t.surplus_value ?? 0,
      t.hidden_talent_index ?? 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sabermetrics_Scouting_Report_Page${currentPage}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Live preview for Draft modal
  const projectedDraftWar = useMemo(() => {
    const rawEngagement =
      draftForm.completion_rate * formulaWeights.engagementMultiplier +
      draftForm.word_of_mouth_score;
    const ipDiscount = 1.0 - draftForm.ip_strength * formulaWeights.ipDiscountFactor;
    const penalty = draftForm.rewrite_ratio * formulaWeights.efficiencyPenalty;
    const war = Math.max(0, rawEngagement * ipDiscount - penalty);
    const costFactor = Math.max(1.0, draftForm.base_cost / 100000.0);
    const valueRating = Math.round((war / costFactor) * 100) / 100;
    return {
      war: Math.round(war * 100) / 100,
      value: valueRating,
    };
  }, [draftForm, formulaWeights]);

  // Live simulation for selected Player Card
  const projectedPlayerWar = useMemo(() => {
    if (!playerEditState) return 0;
    const comp = playerEditState.completion_rate ?? 0;
    const wom = playerEditState.word_of_mouth_score ?? 0;
    const ip = playerEditState.ip_strength ?? 0;
    const rewrite = playerEditState.rewrite_ratio ?? 0;
    const rawEngagement = comp * formulaWeights.engagementMultiplier + wom;
    const ipDiscount = 1.0 - ip * formulaWeights.ipDiscountFactor;
    const penalty = rewrite * formulaWeights.efficiencyPenalty;
    const war = Math.max(0, rawEngagement * ipDiscount - penalty);
    return Math.round(war * 100) / 100;
  }, [playerEditState, formulaWeights]);

  // Execute Kaggle Ingestion Simulation on Sample Films
  const runKaggleSimulation = async () => {
    setSimulating(true);
    setSimulationLogs([]);

    const addLog = (msg: string) => {
      setSimulationLogs((prev) => [...prev, msg]);
    };

    addLog('🚀 Initializing Kaggle Sabermetric Pipeline...');
    await new Promise((r) => setTimeout(r, 350));
    addLog('📖 Loading sample Kaggle records: Toy Story, Pulp Fiction, The Dark Knight, Lady Bird, Get Out, Whiplash, Memento...');
    await new Promise((r) => setTimeout(r, 450));

    const sampleMovies = [
      {
        title: 'Toy Story (1995)',
        budget: 30000000,
        vote_avg: 7.7,
        vote_count: 5415,
        belongs_to_collection: 'Toy Story Collection',
        crew: [
          { name: 'John Lasseter', job: 'Director' },
          { name: 'Joss Whedon', job: 'Screenplay' },
          { name: 'Andrew Stanton', job: 'Screenplay' },
        ],
      },
      {
        title: 'Pulp Fiction (1994)',
        budget: 8000000,
        vote_avg: 8.3,
        vote_count: 8428,
        belongs_to_collection: '',
        crew: [
          { name: 'Quentin Tarantino', job: 'Director' },
          { name: 'Quentin Tarantino', job: 'Screenplay' },
        ],
      },
      {
        title: 'The Dark Knight (2008)',
        budget: 185000000,
        vote_avg: 8.2,
        vote_count: 12002,
        belongs_to_collection: 'The Dark Knight Collection',
        crew: [
          { name: 'Christopher Nolan', job: 'Director' },
          { name: 'Jonathan Nolan', job: 'Screenplay' },
        ],
      },
      {
        title: 'Lady Bird (2017)',
        budget: 10000000,
        vote_avg: 7.3,
        vote_count: 2430,
        belongs_to_collection: '',
        crew: [
          { name: 'Greta Gerwig', job: 'Director' },
          { name: 'Greta Gerwig', job: 'Screenplay' },
        ],
      },
      {
        title: 'Get Out (2017)',
        budget: 4500000,
        vote_avg: 7.6,
        vote_count: 4812,
        belongs_to_collection: '',
        crew: [
          { name: 'Jordan Peele', job: 'Director' },
          { name: 'Jordan Peele', job: 'Screenplay' },
        ],
      },
    ];

    addLog(`📊 Merged ${sampleMovies.length} film metadata and credit profiles.`);
    await new Promise((r) => setTimeout(r, 350));
    addLog('🧠 Deriving Sabermetric metrics per film:');

    interface AggregationItem {
      retention: number[];
      wom: number[];
      budget: number[];
      franchise: number[];
      count: number;
    }

    const aggregation: Record<string, AggregationItem> = {};

    for (const movie of sampleMovies) {
      const derived_retention = Math.min(1.0, Math.max(0.0, movie.vote_avg / 10.0));
      const derived_wom = Math.min(10.0, Math.max(1.0, 1.0 + (movie.vote_count / 1500.0) * 9.0));
      const is_franchise = movie.belongs_to_collection ? 1.0 : 0.0;

      addLog(`  🎬 [${movie.title}] Retention: ${(derived_retention * 100).toFixed(0)}%, WOM: ${derived_wom.toFixed(1)}/10, Franchise IP: ${is_franchise}`);

      for (const member of movie.crew) {
        const role = member.job === 'Director' ? 'Director' : 'Screenwriter';
        const key = `${member.name}::${role}`;
        if (!aggregation[key]) {
          aggregation[key] = { retention: [], wom: [], budget: [], franchise: [], count: 0 };
        }
        aggregation[key].retention.push(derived_retention);
        aggregation[key].wom.push(derived_wom);
        aggregation[key].budget.push(movie.budget > 0 ? movie.budget : 500000);
        aggregation[key].franchise.push(is_franchise);
        aggregation[key].count++;
      }
    }

    await new Promise((r) => setTimeout(r, 450));
    addLog('💾 Aggregating filmmaker career cards and committing to database:');

    const talentRecords: Partial<Talent>[] = [];
    for (const [key, metrics] of Object.entries(aggregation)) {
      const [name, role] = key.split('::');
      const avg_retention = metrics.retention.reduce((a, b) => a + b, 0) / metrics.retention.length;
      const avg_wom = metrics.wom.reduce((a, b) => a + b, 0) / metrics.wom.length;
      const avg_franchise = metrics.franchise.reduce((a, b) => a + b, 0) / metrics.franchise.length;
      const avg_budget = metrics.budget.reduce((a, b) => a + b, 0) / metrics.budget.length;
      const rewrite_variance = metrics.retention.length > 3 ? 0.15 : 0.05;
      const calculated_cost = Math.max(75000, Math.round((avg_budget * 0.02) / 1000) * 1000);

      talentRecords.push({
        name,
        role,
        completion_rate: Math.round(avg_retention * 100) / 100,
        word_of_mouth_score: Math.round(avg_wom * 10) / 10,
        rewrite_ratio: rewrite_variance,
        ip_strength: Math.round(avg_franchise * 100) / 100,
        base_cost: Math.min(1500000, calculated_cost),
      });

      addLog(`  ⭐ ${name} (${role}) -> Ret: ${(avg_retention * 100).toFixed(0)}%, WOM: ${avg_wom.toFixed(1)}, Cap: $${calculated_cost.toLocaleString()}`);
    }

    try {
      const response = await fetch('/talent/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: talentRecords }),
      });
      const resData = await response.json();
      addLog(`🎉 SUCCESS: ${resData.message}`);
      fetchTalent();
      fetchSummary();
      setNotice('Ingestion simulation complete! Profiles synchronized.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        addLog(`❌ Error submitting batch: ${err.message}`);
      }
    } finally {
      setSimulating(false);
    }
  };

  // Direct CSV file upload via PapaParse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Reading CSV file with PapaParse...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          setUploadStatus(`Parsed ${rows.length} rows. Mapping columns...`);

          const mappedTalent: Partial<Talent>[] = [];

          for (const row of rows) {
            const name = row.name || row.Name || row['Creator Name'] || row.creator;
            if (!name) continue;

            const role = row.role || row.Role || row.Discipline || 'Screenwriter';
            const comp = parseFloat(row.completion_rate || row.retention || row['Retention %'] || '0.7');
            const wom = parseFloat(row.word_of_mouth_score || row.wom || row['WOM Score'] || '5.0');
            const rewrite = parseFloat(row.rewrite_ratio || row.rewrite || row['Rewrite Penalty'] || '0.05');
            const ip = parseFloat(row.ip_strength || row.ip || row['IP Reliance'] || '0.0');
            const cost = parseFloat(row.base_cost || row.cost || row['Hiring Cap'] || '100000');

            mappedTalent.push({
              name: String(name).trim(),
              role: String(role).trim(),
              completion_rate: comp > 1 ? comp / 100 : comp,
              word_of_mouth_score: wom,
              rewrite_ratio: rewrite > 1 ? rewrite / 100 : rewrite,
              ip_strength: ip > 1 ? ip / 100 : ip,
              base_cost: cost,
            });
          }

          if (mappedTalent.length === 0) {
            setUploadStatus('❌ Error: No valid talent rows could be identified in the CSV file.');
            return;
          }

          setUploadStatus(`Ingesting ${mappedTalent.length} profiles into database...`);

          const response = await fetch('/talent/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: mappedTalent }),
          });

          if (!response.ok) throw new Error('Server rejected batch import');
          const data = await response.json();
          setUploadStatus(`✅ ${data.message}`);
          fetchTalent();
          fetchSummary();
          setNotice(`Imported ${mappedTalent.length} talent profiles from ${file.name}!`);
        } catch (err: unknown) {
          if (err instanceof Error) {
            setUploadStatus(`❌ Ingestion failed: ${err.message}`);
          }
        }
      },
      error: (err) => {
        setUploadStatus(`❌ CSV parse error: ${err.message}`);
      },
    });
  };

  const copyScriptText = () => {
    const script = `# Sabermetric Ingestion Script for The Movies Dataset (Kaggle)
# Source: https://www.kaggle.com/datasets/rounakbanik/the-movies-dataset
# Run locally with: python scripts/ingest.py

import os, ast, json
import pandas as pd
from tqdm import tqdm

base_path = "movie_data"
# ... See scripts/ingest.py for full pipeline`;

    navigator.clipboard.writeText(script);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Lineup builder metrics
  const lineupMetrics = useMemo(() => {
    const totalCost = (lineupWriter?.base_cost ?? 0) + (lineupDirector?.base_cost ?? 0);
    const totalWar = (lineupWriter?.creative_war ?? 0) + (lineupDirector?.creative_war ?? 0);
    const underBudget = lineupCap - totalCost;

    // Creative chemistry: writer with high WOM + director with low rewrite = optimal
    let chemistryScore = 75;
    if (lineupWriter && lineupDirector) {
      if ((lineupDirector.rewrite_ratio ?? 0) <= 0.08) chemistryScore += 15;
      if ((lineupWriter.word_of_mouth_score ?? 0) >= 8.0) chemistryScore += 10;
      if (lineupWriter.ip_strength <= 0.1 && lineupDirector.ip_strength <= 0.1) chemistryScore += 5;
    }
    chemistryScore = Math.min(100, chemistryScore);

    return {
      totalCost,
      totalWar: Math.round(totalWar * 100) / 100,
      underBudget,
      chemistryScore,
      valueYield: totalCost > 0 ? (totalWar / Math.max(1, totalCost / 100000)).toFixed(2) : '0.00',
    };
  }, [lineupWriter, lineupDirector, lineupCap]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Banner Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Award size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white uppercase">
                  Creative Sabermetrics Studio
                </h1>
                <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Moneyball Front Office
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                FanGraphs-style empirical valuation for Screenwriters, Directors & Novelists
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPipelineModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60 transition shadow-sm"
              title="Kaggle Dataset Ingestion & CSV Import Pipeline"
            >
              <Database size={14} />
              Kaggle Pipeline
            </button>

            <button
              onClick={() => setShowFormulaDrawer(!showFormulaDrawer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                showFormulaDrawer
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Tune Sabermetric Algorithmic Weights"
            >
              <SlidersHorizontal size={14} />
              Formula Sandbox
            </button>

            <button
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition"
              title="View Sabermetrics Methodology Breakdown"
            >
              <BookOpen size={14} />
              Methodology
            </button>

            <button
              onClick={exportScoutingReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition"
              title="Download CSV report of current roster"
            >
              <Download size={14} />
              Export
            </button>

            <button
              onClick={() => setShowDraftModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20"
            >
              <Plus size={15} />
              Draft Prospect
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Executive KPI Stats Ribbon */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Scouting Database
            </span>
            <div className="text-xl font-black text-white mt-0.5">
              {summary ? summary.total_creators.toLocaleString() : totalCount.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500 font-sans">profiles</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Market Mean WAR
            </span>
            <div className="text-xl font-black text-emerald-400 mt-0.5">
              {summary ? `${summary.avg_war} WAR` : '6.84 WAR'}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Undervalued Targets
            </span>
            <div className="text-xl font-black text-amber-400 mt-0.5 flex items-center gap-1">
              <Zap size={16} />
              {summary ? summary.undervalued_count.toLocaleString() : '26,300+'}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Shortlisted Assets
            </span>
            <div className="text-xl font-black text-sky-400 mt-0.5 flex items-center gap-1">
              <Star size={16} className="text-amber-400 fill-amber-400" />
              {watchlist.length} <span className="text-xs font-normal text-slate-500">starred</span>
            </div>
          </div>
        </section>

        {/* View Mode Tabs Deck */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'matrix'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={14} /> Scouting Matrix
            </button>

            <button
              onClick={() => setViewMode('scatter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'scatter'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 size={14} /> Moneyball Quadrant Matrix
            </button>

            <button
              onClick={() => setViewMode('sleepers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'sleepers'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target size={14} /> Hidden Sleepers (HTI)
            </button>

            <button
              onClick={() => setViewMode('lineup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'lineup'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={14} /> Studio Lineup Builder
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowWatchlistOnly((prev) => !prev);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                showWatchlistOnly
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Star size={13} className={showWatchlistOnly ? 'fill-amber-400 text-amber-400' : ''} />
              Watchlist Only ({watchlist.length})
            </button>
          </div>
        </div>

        {/* Formula Weight Sandbox Drawer (Collapsible) */}
        {showFormulaDrawer && (
          <section className="bg-slate-900/95 border border-emerald-500/30 rounded-xl p-5 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="text-emerald-400" size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">
                  Moneyball Formula Algorithmic Sandbox
                </h3>
              </div>
              <button
                onClick={() =>
                  setFormulaWeights({
                    engagementMultiplier: 10.0,
                    ipDiscountFactor: 0.5,
                    efficiencyPenalty: 3.0,
                  })
                }
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
              >
                <RefreshCw size={12} /> Reset to Defaults
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Recalculate Creative WAR live across all 41,758 creators. Adjust how aggressively the
              studio weights retention vs viral WOM, penalizes IP crutches, and fines production rewrites.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    1. xEngagement Retention Weight
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {formulaWeights.engagementMultiplier}x
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="15"
                  step="0.5"
                  value={formulaWeights.engagementMultiplier}
                  onChange={(e) =>
                    setFormulaWeights((prev) => ({
                      ...prev,
                      engagementMultiplier: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-emerald-400"
                />
                <span className="text-[11px] text-slate-500 block">
                  Scales completion rate (0.0–1.0) before adding WOM exit velocity.
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    2. Context Independence (IP Discount)
                  </span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {formulaWeights.ipDiscountFactor}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={formulaWeights.ipDiscountFactor}
                  onChange={(e) =>
                    setFormulaWeights((prev) => ({
                      ...prev,
                      ipDiscountFactor: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-400"
                />
                <span className="text-[11px] text-slate-500 block">
                  Reduces WAR credit for franchise projects (Park Factor adjustment).
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    3. Production Efficiency Penalty (OBP)
                  </span>
                  <span className="font-mono text-rose-400 font-bold">
                    {formulaWeights.efficiencyPenalty}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.5"
                  value={formulaWeights.efficiencyPenalty}
                  onChange={(e) =>
                    setFormulaWeights((prev) => ({
                      ...prev,
                      efficiencyPenalty: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-rose-400"
                />
                <span className="text-[11px] text-slate-500 block">
                  Penalizes drafts requiring extensive reshoots and chaotic rework.
                </span>
              </div>
            </div>
          </section>
        )}

        {/* VIEW 1: SCOUTING MATRIX (Default Grid) */}
        {viewMode === 'matrix' && (
          <div className="space-y-5">
            {/* Quick Scouting Presets Bar */}
            <section className="flex flex-wrap items-center gap-2 pb-1 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">
                Scouting Scenarios:
              </span>

              <button
                onClick={() => applyPreset('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activePreset === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                All Creators
              </button>

              <button
                onClick={() => applyPreset('hti_sleepers')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  activePreset === 'hti_sleepers'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sparkles size={13} />
                Hidden Sleepers (Top HTI)
              </button>

              <button
                onClick={() => applyPreset('moneyball')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  activePreset === 'moneyball'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Zap size={13} />
                Moneyball Bargains (&lt;$150k Cap)
              </button>

              <button
                onClick={() => applyPreset('original_voices')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activePreset === 'original_voices'
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Original Voices (Pure IP)
              </button>

              <button
                onClick={() => applyPreset('finishers')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activePreset === 'finishers'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Disciplined Finishers (Low Rewrite)
              </button>

              <button
                onClick={() => applyPreset('viral')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  activePreset === 'viral'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Flame size={13} />
                Top Exit Velocity (WOM)
              </button>

              <button
                onClick={() => applyPreset('all_stars')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activePreset === 'all_stars'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Franchise Aces (10+ WAR)
              </button>
            </section>

            {/* Query & Filter Suite */}
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  {/* Search across all 41,758 creators */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
                    <input
                      type="text"
                      placeholder="Search 41,758 creators (e.g., Nolan, Gerwig)..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>

                  {/* Discipline dropdown */}
                  <select
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Disciplines</option>
                    <option value="Screenwriter">Screenwriters</option>
                    <option value="Director">Directors</option>
                    <option value="Novelist">Novelists</option>
                  </select>

                  {/* Max contract cap */}
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 text-slate-500" size={14} />
                    <input
                      type="number"
                      placeholder="Max Cap ($)"
                      className="w-32 bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                      value={maxCostFilter}
                      onChange={(e) => {
                        setMaxCostFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>

                  {/* Min WAR filter */}
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Min WAR"
                      className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                      value={minWarFilter}
                      onChange={(e) => {
                        setMinWarFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </div>

                {/* Sorting & Undervalued Toggle */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <ArrowUpDown size={13} />
                    <select
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="war">Sort: Creative WAR</option>
                      <option value="hti">Sort: Hidden Talent Index (HTI)</option>
                      <option value="value">Sort: Value ROI Index</option>
                      <option value="cost_per_war">Sort: Best $/WAR (Lowest)</option>
                      <option value="surplus">Sort: Surplus Value ($ Saved)</option>
                      <option value="cost">Sort: Market Cost</option>
                      <option value="name">Sort: Name (A-Z)</option>
                      <option value="completion">Sort: Retention %</option>
                      <option value="wom">Sort: Exit Velocity</option>
                      <option value="rewrite">Sort: Rewrite Discipline</option>
                      <option value="ip">Sort: IP Independence</option>
                    </select>

                    <button
                      onClick={() => setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      className="bg-slate-950 border border-slate-700 px-2 py-1.5 rounded-lg text-xs font-mono uppercase font-bold text-slate-300 hover:text-white"
                      title="Toggle Ascending / Descending"
                    >
                      {sortDir}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setUndervaluedOnly((prev) => !prev);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wide border transition-all ${
                      undervaluedOnly
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-emerald-950/40'
                        : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Zap size={14} className={undervaluedOnly ? 'animate-pulse' : ''} />
                    UNDERVALUED ONLY
                  </button>
                </div>
              </div>
            </section>

            {/* Notifications */}
            {notice && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 p-3 rounded-xl text-sm text-emerald-300 flex items-center justify-between animate-fadeIn">
                <span>{notice}</span>
                <button
                  onClick={() => setNotice(null)}
                  className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded"
                >
                  Dismiss
                </button>
              </div>
            )}

            {error && (
              <div className="bg-rose-500/20 border border-rose-500/60 p-4 rounded-xl text-sm text-rose-300 flex items-center justify-between">
                <span>⚠️ {error}</span>
                <button
                  onClick={() => fetchTalent()}
                  className="text-xs bg-rose-500/30 hover:bg-rose-500/50 px-2.5 py-1 rounded font-bold"
                >
                  Retry Query
                </button>
              </div>
            )}

            {/* Main Table */}
            {loading && talentPool.length === 0 ? (
              <div className="text-center py-24 text-slate-400 space-y-2">
                <div className="inline-block animate-spin text-emerald-400 mb-2">
                  <RefreshCw size={24} />
                </div>
                <p className="font-semibold text-sm">Querying Sabermetric database matrix...</p>
                <p className="text-xs text-slate-500">Evaluating 41,758 creators against Statcast models</p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold text-[11px] tracking-wider uppercase">
                        <th className="p-3 w-8 text-center">★</th>
                        <th className="p-3 w-10 text-center" title="Bench up to 2 for side-by-side comparison">
                          Bench
                        </th>
                        <th className="p-3 min-w-[170px]">Creative Asset</th>
                        <th className="p-3">Discipline</th>
                        <th className="p-3" title="Hidden Talent Index (0 to 100 sleeper rating)">
                          HTI Rating
                        </th>
                        <th className="p-3" title="Audience finish rate (0.0 to 1.0)">
                          Retention %
                        </th>
                        <th className="p-3" title="Organic exit velocity / viral lift (1 to 10)">
                          WOM Velocity
                        </th>
                        <th className="p-3" title="Production inefficiency penalty">
                          Rewrite
                        </th>
                        <th className="p-3 text-right font-mono">Hiring Cap</th>
                        <th className="p-3 text-right font-mono" title="Dollars invested per 1.0 WAR produced">
                          $/WAR
                        </th>
                        <th className="p-3 text-center text-amber-400 font-mono" title="WAR generated per $100k contract tier">
                          Value ROI
                        </th>
                        <th className="p-3 bg-emerald-950/40 text-emerald-400 font-black text-center min-w-[95px]">
                          Creative WAR
                        </th>
                        <th className="p-3 text-center w-16">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {talentPool.map((talent) => {
                        const isCompared = compareList.some((c) => c.id === talent.id);
                        const isStarred = watchlist.includes(talent.id);
                        const costPerWar = talent.cost_per_war ?? Math.round(talent.base_cost / Math.max(0.1, talent.creative_war));

                        return (
                          <tr
                            key={talent.id}
                            className={`hover:bg-slate-800/50 transition-colors ${
                              isCompared ? 'bg-sky-950/30 border-l-2 border-sky-400' : ''
                            }`}
                          >
                            {/* Star Watchlist */}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => toggleWatchlist(talent.id)}
                                className="text-slate-600 hover:text-amber-400 transition"
                                title={isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}
                              >
                                <Star
                                  size={15}
                                  className={isStarred ? 'text-amber-400 fill-amber-400' : ''}
                                />
                              </button>
                            </td>

                            {/* Bench checkbox */}
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isCompared}
                                onChange={() => toggleComparison(talent)}
                                className="w-4 h-4 accent-sky-400 cursor-pointer rounded"
                                title="Add to comparison bench"
                              />
                            </td>

                            {/* Name */}
                            <td className="p-3 font-semibold text-white">
                              <button
                                onClick={() => openPlayerCard(talent)}
                                className="hover:text-emerald-400 text-left transition flex items-center gap-1.5"
                              >
                                <span>{talent.name}</span>
                              </button>
                            </td>

                            {/* Role */}
                            <td className="p-3 text-slate-400 text-xs font-medium">
                              {talent.role}
                            </td>

                            {/* HTI Score Badge */}
                            <td className="p-3">
                              <span
                                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                  (talent.hidden_talent_index ?? 0) >= 80
                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                                    : (talent.hidden_talent_index ?? 0) >= 65
                                    ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {talent.hidden_talent_index ?? '—'}
                              </span>
                            </td>

                            {/* Retention Rate */}
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={talent.completion_rate ?? 0}
                                  onChange={(e) =>
                                    handleUpdateMetric(talent.id, 'completion_rate', e.target.value)
                                  }
                                  className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white text-right focus:border-emerald-500 focus:outline-none"
                                />
                                <span className="text-xs text-slate-500 font-mono">
                                  ({Math.round((talent.completion_rate ?? 0) * 100)}%)
                                </span>
                              </div>
                            </td>

                            {/* WOM Velocity */}
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={talent.word_of_mouth_score ?? 0}
                                onChange={(e) =>
                                  handleUpdateMetric(talent.id, 'word_of_mouth_score', e.target.value)
                                }
                                className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white text-right focus:border-emerald-500 focus:outline-none"
                              />
                            </td>

                            {/* Rewrite Ratio */}
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.01"
                                value={talent.rewrite_ratio ?? 0}
                                onChange={(e) =>
                                  handleUpdateMetric(talent.id, 'rewrite_ratio', e.target.value)
                                }
                                className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white text-right focus:border-emerald-500 focus:outline-none"
                              />
                            </td>

                            {/* Base Cost */}
                            <td className="p-3 text-right font-mono text-slate-300">
                              ${(talent.base_cost ?? 0).toLocaleString()}
                            </td>

                            {/* $/WAR */}
                            <td className="p-3 text-right font-mono text-xs text-slate-400">
                              <span className={costPerWar <= 25000 ? 'text-emerald-400 font-bold' : ''}>
                                ${costPerWar.toLocaleString()}
                              </span>
                            </td>

                            {/* Value ROI */}
                            <td className="p-3 text-center font-mono font-bold text-amber-400">
                              {talent.value_rating}x
                            </td>

                            {/* Creative WAR */}
                            <td className="p-3 bg-emerald-950/20 text-center font-mono text-emerald-400 font-black">
                              <div className="flex flex-col items-center">
                                <span>{talent.creative_war}</span>
                                {talent.creative_war >= 10.0 && (
                                  <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-sans font-bold">
                                    Elite
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Quick View Button */}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => openPlayerCard(talent)}
                                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
                                title="Open Player Card"
                              >
                                <User size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {talentPool.length === 0 && !loading && (
                        <tr>
                          <td colSpan={13} className="p-12 text-center text-slate-400">
                            <div className="max-w-md mx-auto space-y-2">
                              <p className="font-semibold text-white">
                                No creative profiles match the specified scouting criteria.
                              </p>
                              <p className="text-xs text-slate-500">
                                Try clearing active filters or resetting to the complete talent pool.
                              </p>
                              <button
                                onClick={() => applyPreset('all')}
                                className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-emerald-400 font-bold"
                              >
                                Reset All Filters
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls Deck */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-slate-400 font-medium">
                    Showing{' '}
                    <span className="font-mono text-white font-bold">
                      {Math.min(totalCount, (currentPage - 1) * pageSize + 1)}
                    </span>{' '}
                    to{' '}
                    <span className="font-mono text-white font-bold">
                      {Math.min(totalCount, currentPage * pageSize)}
                    </span>{' '}
                    of <span className="font-mono text-white font-bold">{totalCount.toLocaleString()}</span>{' '}
                    evaluated creators
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loading}
                      className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-30 flex items-center gap-1 transition"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    <span className="text-xs text-slate-400 font-mono px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || loading}
                      className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-30 flex items-center gap-1 transition"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: MONEYBALL SCATTER QUADRANT MATRIX */}
        {viewMode === 'scatter' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <BarChart3 className="text-emerald-400" size={20} />
                  Moneyball 4-Quadrant Value Matrix
                </h3>
                <p className="text-xs text-slate-400">
                  Visualizing Hiring Cap ($X) against Creative WAR ($Y). Top-left quadrant isolates high-yield bargains.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Top Value (ROI &ge; 5x)
                </span>
                <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> Strong Asset (ROI 2-5x)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> High Contract Premium
                </span>
              </div>
            </div>

            {loadingScatter ? (
              <div className="text-center py-28 text-slate-400">
                <div className="inline-block animate-spin text-emerald-400 mb-2">
                  <RefreshCw size={24} />
                </div>
                <p className="text-xs">Plotting 300 stratified creators across 4 quadrants...</p>
              </div>
            ) : (
              <div className="relative border border-slate-800 rounded-xl bg-slate-950 p-4">
                {/* SVG Visual Plot */}
                <svg viewBox="0 0 800 450" className="w-full h-auto overflow-visible select-none">
                  {/* Grid Lines */}
                  <line x1="80" y1="225" x2="760" y2="225" stroke="#334155" strokeDasharray="4 4" />
                  <line x1="420" y1="30" x2="420" y2="400" stroke="#334155" strokeDasharray="4 4" />

                  {/* Quadrant Labels */}
                  <text x="100" y="55" fill="#10b981" fontSize="11" fontWeight="bold" opacity="0.85">
                    🟢 MONEYBALL GOLDMINES (High WAR / Budget Cost)
                  </text>
                  <text x="440" y="55" fill="#38bdf8" fontSize="11" fontWeight="bold" opacity="0.85">
                    🔵 FRANCHISE SUPERSTARS (High WAR / Premium Cost)
                  </text>
                  <text x="100" y="385" fill="#64748b" fontSize="11" fontWeight="bold" opacity="0.85">
                    ⚪ REPLACEMENT LEVEL (Low WAR / Low Cost)
                  </text>
                  <text x="440" y="385" fill="#f43f5e" fontSize="11" fontWeight="bold" opacity="0.85">
                    🔴 OVERPAID LIABILITIES (Low WAR / High Cost)
                  </text>

                  {/* Axis Labels */}
                  <text x="420" y="435" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold">
                    Hiring Cap ($75k → $1.5M)
                  </text>
                  <text x="35" y="225" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold" transform="rotate(-90 35 225)">
                    Creative WAR (0 → 20)
                  </text>

                  {/* Plotted Creator Dots */}
                  {scatterData.map((d) => {
                    // Map cost ($75k to $1.5M) to X (80 to 760)
                    const costNorm = Math.min(1.0, Math.max(0, (d.base_cost - 75000) / (1500000 - 75000)));
                    const x = 80 + costNorm * 680;

                    // Map WAR (0 to 20) to Y (400 to 30)
                    const warNorm = Math.min(1.0, Math.max(0, d.creative_war / 20.0));
                    const y = 400 - warNorm * 370;

                    const color =
                      d.value_rating >= 6.0
                        ? '#34d399'
                        : d.value_rating >= 2.5
                        ? '#38bdf8'
                        : '#fbbf24';

                    const isHovered = hoveredScatterItem?.id === d.id;

                    return (
                      <g key={d.id}>
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 8 : d.creative_war >= 12 ? 5.5 : 4}
                          fill={color}
                          opacity={isHovered ? 1 : 0.85}
                          className="cursor-pointer transition-all hover:scale-150"
                          onMouseEnter={() => setHoveredScatterItem(d)}
                          onClick={() => openPlayerCard(d)}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Hover inspection card overlay */}
                {hoveredScatterItem && (
                  <div className="absolute top-6 right-6 bg-slate-900 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs max-w-xs animate-fadeIn space-y-1">
                    <div className="flex justify-between items-start">
                      <strong className="text-white text-sm">{hoveredScatterItem.name}</strong>
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">
                        {hoveredScatterItem.role}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Market Cap: <span className="font-mono text-white">${hoveredScatterItem.base_cost.toLocaleString()}</span>
                    </div>
                    <div className="text-emerald-400 font-mono font-bold">
                      {hoveredScatterItem.creative_war} WAR ({hoveredScatterItem.value_rating}x ROI)
                    </div>
                    <div className="text-[11px] text-amber-400">
                      Hidden Talent Index: {hoveredScatterItem.hidden_talent_index ?? '—'}/100
                    </div>
                    <button
                      onClick={() => openPlayerCard(hoveredScatterItem)}
                      className="mt-2 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-1 rounded text-[11px]"
                    >
                      Inspect Player Card
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* VIEW 3: HIDDEN TALENT LEADERBOARD (Top HTI Sleepers) */}
        {viewMode === 'sleepers' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <Target className="text-amber-400" size={20} />
                  Top 50 Hidden Sleepers (Moneyball HTI Index)
                </h3>
                <p className="text-xs text-slate-400">
                  Ranking creators with highest organic audience lift and lowest studio hiring cost.
                </p>
              </div>

              <button
                onClick={() => applyPreset('hti_sleepers')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                Sync with Table Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {talentPool
                .filter((t) => (t.hidden_talent_index ?? 0) >= 60)
                .slice(0, 18)
                .map((sleeper) => (
                  <article
                    key={sleeper.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-emerald-500/40 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{sleeper.name}</h4>
                        <span className="text-[11px] text-slate-400">{sleeper.role}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          HTI Rating
                        </span>
                        <span className="text-lg font-mono font-black text-amber-400">
                          {sleeper.hidden_talent_index ?? '—'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Hiring Cap</span>
                        <span className="font-mono text-white">${sleeper.base_cost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Audience Finish</span>
                        <span className="font-mono text-emerald-400">{Math.round(sleeper.completion_rate * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">WOM Exit Velocity</span>
                        <span className="font-mono text-indigo-400">{sleeper.word_of_mouth_score} / 10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cost per WAR</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          ${(sleeper.cost_per_war ?? Math.round(sleeper.base_cost / Math.max(0.1, sleeper.creative_war))).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-xs text-amber-400 font-mono font-bold">
                        {sleeper.value_rating}x ROI
                      </span>
                      <button
                        onClick={() => openPlayerCard(sleeper)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded font-bold transition"
                      >
                        Inspect
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}

        {/* VIEW 4: STUDIO LINEUP BUILDER */}
        {viewMode === 'lineup' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <Users className="text-sky-400" size={20} />
                  Moneyball Production Package Assembler
                </h3>
                <p className="text-xs text-slate-400">
                  Combine complementary Screenwriters and Directors to hit target WAR without blowing production budget.
                </p>
              </div>

              {/* Cap Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-bold uppercase">Package Cap:</span>
                {[500000, 1000000, 2000000].map((cap) => (
                  <button
                    key={cap}
                    onClick={() => setLineupCap(cap)}
                    className={`px-3 py-1 rounded-lg font-mono font-bold transition ${
                      lineupCap === cap
                        ? 'bg-sky-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    ${(cap / 1000000).toFixed(1)}M
                  </button>
                ))}
              </div>
            </div>

            {/* Slots Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Writer Slot */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase font-bold text-slate-400">1. Screenwriter Slot</span>
                  {lineupWriter && (
                    <button
                      onClick={() => setLineupWriter(null)}
                      className="text-xs text-rose-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {lineupWriter ? (
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white">{lineupWriter.name}</h4>
                    <div className="text-xs text-slate-400 flex justify-between">
                      <span>Contract: ${lineupWriter.base_cost.toLocaleString()}</span>
                      <span className="text-emerald-400 font-bold">{lineupWriter.creative_war} WAR</span>
                    </div>
                    <div className="text-xs text-slate-400 flex justify-between">
                      <span>WOM Exit Velocity: {lineupWriter.word_of_mouth_score}/10</span>
                      <span>Rewrite: {Math.round(lineupWriter.rewrite_ratio * 100)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-2">
                    <p className="text-xs text-slate-400">No Screenwriter selected.</p>
                    <span className="text-[11px] text-slate-500 block">Select from the matrix table or pick top suggestion below:</span>
                    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                      {talentPool
                        .filter((t) => t.role === 'Screenwriter' && (t.base_cost ?? 0) <= lineupCap / 2)
                        .slice(0, 3)
                        .map((w) => (
                          <button
                            key={w.id}
                            onClick={() => setLineupWriter(w)}
                            className="text-[11px] bg-slate-900 border border-slate-700 hover:border-emerald-400 text-slate-200 px-2.5 py-1 rounded font-medium"
                          >
                            + {w.name} ({w.creative_war} WAR)
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Director Slot */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase font-bold text-slate-400">2. Director Slot</span>
                  {lineupDirector && (
                    <button
                      onClick={() => setLineupDirector(null)}
                      className="text-xs text-rose-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {lineupDirector ? (
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white">{lineupDirector.name}</h4>
                    <div className="text-xs text-slate-400 flex justify-between">
                      <span>Contract: ${lineupDirector.base_cost.toLocaleString()}</span>
                      <span className="text-emerald-400 font-bold">{lineupDirector.creative_war} WAR</span>
                    </div>
                    <div className="text-xs text-slate-400 flex justify-between">
                      <span>Retention: {Math.round(lineupDirector.completion_rate * 100)}%</span>
                      <span>Rewrite Discipline: {Math.round(lineupDirector.rewrite_ratio * 100)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-2">
                    <p className="text-xs text-slate-400">No Director selected.</p>
                    <span className="text-[11px] text-slate-500 block">Select from the matrix table or pick top suggestion below:</span>
                    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                      {talentPool
                        .filter((t) => t.role === 'Director' && (t.base_cost ?? 0) <= lineupCap / 2)
                        .slice(0, 3)
                        .map((d) => (
                          <button
                            key={d.id}
                            onClick={() => setLineupDirector(d)}
                            className="text-[11px] bg-slate-900 border border-slate-700 hover:border-emerald-400 text-slate-200 px-2.5 py-1 rounded font-medium"
                          >
                            + {d.name} ({d.creative_war} WAR)
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Total Lineup Evaluation Deck */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Package Cost</span>
                <span className="text-xl font-mono font-bold text-white">
                  ${lineupMetrics.totalCost.toLocaleString()}
                </span>
                <span className={`text-[10px] block ${lineupMetrics.underBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {lineupMetrics.underBudget >= 0 ? `-$${lineupMetrics.underBudget.toLocaleString()} under cap` : `+$${Math.abs(lineupMetrics.underBudget).toLocaleString()} OVER CAP`}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Combined Team WAR</span>
                <span className="text-xl font-mono font-black text-emerald-400">
                  {lineupMetrics.totalWar} WAR
                </span>
                <span className="text-[10px] text-slate-500 block">
                  +{Math.max(0, (lineupMetrics.totalWar - 3.0)).toFixed(1)} vs 2 Journeymen
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Value Yield</span>
                <span className="text-xl font-mono font-bold text-amber-400">
                  {lineupMetrics.valueYield}x ROI
                </span>
                <span className="text-[10px] text-slate-500 block">Per $100k committed</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Creative Chemistry</span>
                <span className="text-xl font-mono font-bold text-sky-400">
                  {lineupMetrics.chemistryScore}%
                </span>
                <span className="text-[10px] text-slate-500 block">Discipline &amp; Craft Match</span>
              </div>
            </div>
          </section>
        )}

        {/* Head-to-Head Comparison Bench Module */}
        {compareList.length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Scale className="text-sky-400" size={20} />
                <h2 className="text-lg font-black uppercase tracking-tight text-white">
                  Head-to-Head Scouting Bench (Tale of the Tape)
                </h2>
              </div>
              <button
                onClick={() => setCompareList([])}
                aria-label="Clear comparison"
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {compareList.map((asset) => (
                <article
                  key={asset.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-lg text-white">{asset.name}</h3>
                      <span className="text-xs text-slate-400 font-medium">{asset.role}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Market Cap</span>
                      <span className="text-lg font-bold font-mono text-white">
                        ${(asset.base_cost ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Stat bars */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Audience Retention (Completion)</span>
                        <span className="font-mono font-bold text-white">
                          {Math.round((asset.completion_rate ?? 0) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="bg-sky-400 h-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (asset.completion_rate ?? 0) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Organic WOM Velocity (Exit Velocity)</span>
                        <span className="font-mono font-bold text-indigo-400">
                          {asset.word_of_mouth_score ?? 0} / 10
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-400 h-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (asset.word_of_mouth_score ?? 0) * 10)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="bg-slate-900 border border-slate-800 rounded p-2">
                        <span className="text-slate-400 text-[10px] uppercase block">
                          IP Reliance
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          {Math.round((asset.ip_strength ?? 0) * 100)}%
                        </span>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 rounded p-2">
                        <span className="text-slate-400 text-[10px] uppercase block">
                          Rewrite Variance
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          {Math.round((asset.rewrite_ratio ?? 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Value Rating</span>
                      <span className="text-amber-400 font-mono font-bold text-base">
                        {asset.value_rating}x ROI
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-slate-500 block">Total Contribution</span>
                      <span className="text-emerald-400 font-mono font-black text-xl">
                        {asset.creative_war} WAR
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {compareList.length === 2 && (
              <div className="mt-5 p-4 bg-slate-950 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="text-emerald-400" size={16} />
                  <h4 className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                    Front Office Signing Recommendation
                  </h4>
                </div>
                <p className="text-xs text-slate-300">
                  {compareList[0].value_rating > compareList[1].value_rating ? (
                    <>
                      <strong className="text-white">{compareList[0].name}</strong> offers superior
                      Moneyball surplus value ({compareList[0].value_rating}x ROI vs{' '}
                      {compareList[1].value_rating}x ROI). At ${compareList[0].base_cost.toLocaleString()}
                      , they generate{' '}
                      <strong className="text-emerald-400">
                        {(
                          (compareList[0].creative_war / Math.max(1, compareList[0].base_cost / 100000)) -
                          (compareList[1].creative_war / Math.max(1, compareList[1].base_cost / 100000))
                        ).toFixed(2)}
                        x
                      </strong>{' '}
                      more WAR per $100k invested.
                    </>
                  ) : (
                    <>
                      <strong className="text-white">{compareList[1].name}</strong> offers superior
                      Moneyball surplus value ({compareList[1].value_rating}x ROI vs{' '}
                      {compareList[0].value_rating}x ROI). At ${compareList[1].base_cost.toLocaleString()}
                      , they generate{' '}
                      <strong className="text-emerald-400">
                        {(
                          (compareList[1].creative_war / Math.max(1, compareList[1].base_cost / 100000)) -
                          (compareList[0].creative_war / Math.max(1, compareList[0].base_cost / 100000))
                        ).toFixed(2)}
                        x
                      </strong>{' '}
                      more WAR per $100k invested.
                    </>
                  )}
                </p>
              </div>
            )}

            {compareList.length === 1 && (
              <p className="mt-4 text-center text-slate-500 text-xs">
                Select a second creator from the bench checkboxes above to unlock head-to-head
                comparative scouting analysis.
              </p>
            )}
          </section>
        )}
      </main>

      {/* Deep-Dive Player Card Drawer / Modal */}
      {selectedTalent && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex justify-end animate-fadeIn">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full overflow-y-auto p-6 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-white">{selectedTalent.name}</h3>
                    <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                      {selectedTalent.role}
                    </span>
                    <button
                      onClick={() => toggleWatchlist(selectedTalent.id)}
                      className="text-slate-500 hover:text-amber-400 p-1"
                      title="Toggle Watchlist"
                    >
                      <Star
                        size={18}
                        className={watchlist.includes(selectedTalent.id) ? 'text-amber-400 fill-amber-400' : ''}
                      />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 font-mono block mt-0.5">
                    ID: {selectedTalent.id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTalent(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Sabermetric Pillars Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Creative WAR
                  </span>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
                    {projectedPlayerWar}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    +{Math.max(0, Math.round((projectedPlayerWar - 1.5) * 100) / 100)} vs Journeyman
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    HTI Sleeper Index
                  </span>
                  <div className="text-2xl font-black font-mono text-amber-400 mt-0.5">
                    {selectedTalent.hidden_talent_index ?? '—'}/100
                  </div>
                  <span className="text-[10px] text-slate-500 block">Organic craft score</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Cost per WAR
                  </span>
                  <div className="text-2xl font-black font-mono text-sky-400 mt-0.5">
                    ${Math.round((playerEditState.base_cost ?? 75000) / Math.max(0.1, projectedPlayerWar)).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Per 1.0 WAR yield</span>
                </div>
              </div>

              {/* Statistical Comps (Bill James Similarity) */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    Closest Statistical Comps (Bill James Algorithm)
                  </h4>
                  <span className="text-[10px] text-slate-500">Across 41,758 creators</span>
                </div>

                {loadingComps ? (
                  <div className="text-center py-4 text-xs text-slate-500 animate-pulse">
                    Calculating similarity distance...
                  </div>
                ) : talentComps.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {talentComps.map((comp) => (
                      <div
                        key={comp.id}
                        onClick={() => openPlayerCard(comp)}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-2.5 rounded-lg cursor-pointer transition space-y-1"
                      >
                        <div className="flex justify-between items-start">
                          <strong className="text-white text-xs truncate block">{comp.name}</strong>
                          <span className="text-[10px] font-mono font-bold text-emerald-400">
                            {comp.similarity_pct}%
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>{comp.role}</span>
                          <span className="font-mono text-slate-300">{comp.creative_war} WAR</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No peers calculated.</p>
                )}
              </div>

              {/* Live Statcast Simulation Sliders */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-emerald-400" />
                    Statcast Metrics Simulation
                  </h4>
                  <span className="text-[11px] text-slate-500">Edit &amp; Simulate</span>
                </div>

                {/* Audience Retention Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Audience Retention (Completion)</span>
                    <span className="font-mono text-white font-bold">
                      {Math.round((playerEditState.completion_rate ?? 0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={playerEditState.completion_rate ?? 0}
                    onChange={(e) =>
                      setPlayerEditState((prev) => ({
                        ...prev,
                        completion_rate: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-400"
                  />
                </div>

                {/* WOM Score Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Organic WOM (Exit Velocity)</span>
                    <span className="font-mono text-indigo-400 font-bold">
                      {playerEditState.word_of_mouth_score ?? 0} / 10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.1"
                    value={playerEditState.word_of_mouth_score ?? 1}
                    onChange={(e) =>
                      setPlayerEditState((prev) => ({
                        ...prev,
                        word_of_mouth_score: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-400"
                  />
                </div>

                {/* Rewrite Ratio Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Rewrite Penalty (Production Inefficiency)</span>
                    <span className="font-mono text-rose-400 font-bold">
                      {Math.round((playerEditState.rewrite_ratio ?? 0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={playerEditState.rewrite_ratio ?? 0}
                    onChange={(e) =>
                      setPlayerEditState((prev) => ({
                        ...prev,
                        rewrite_ratio: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-rose-400"
                  />
                </div>

                {/* IP Strength Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">IP Reliance (0 = Original, 1 = Heavy Franchise)</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.round((playerEditState.ip_strength ?? 0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={playerEditState.ip_strength ?? 0}
                    onChange={(e) =>
                      setPlayerEditState((prev) => ({
                        ...prev,
                        ip_strength: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-400"
                  />
                </div>

                {/* Base Cost */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Hiring Cap / Market Cost ($)</span>
                    <span className="font-mono text-white font-bold">
                      ${(playerEditState.base_cost ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="10000"
                    value={playerEditState.base_cost ?? 75000}
                    onChange={(e) =>
                      setPlayerEditState((prev) => ({
                        ...prev,
                        base_cost: Math.max(0, parseFloat(e.target.value) || 0),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => setSelectedTalent(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-lg text-xs transition"
              >
                Close
              </button>
              <button
                onClick={savePlayerMetrics}
                disabled={savingPlayer}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Check size={14} />
                {savingPlayer ? 'Saving to Database...' : 'Save Metrics'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft New Prospect Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="text-emerald-400" size={18} />
                <h3 className="font-black text-lg text-white uppercase tracking-tight">
                  Scout &amp; Draft New Creator
                </h3>
              </div>
              <button
                onClick={() => setShowDraftModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDraftSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1">
                  Creator Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Greta Gerwig, Jordan Peele, Cormac McCarthy"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  value={draftForm.name}
                  onChange={(e) => setDraftForm({ ...draftForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase block mb-1">
                    Discipline / Role
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    value={draftForm.role}
                    onChange={(e) => setDraftForm({ ...draftForm, role: e.target.value })}
                  >
                    <option value="Screenwriter">Screenwriter</option>
                    <option value="Director">Director</option>
                    <option value="Novelist">Novelist</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase block mb-1">
                    Hiring Cap ($)
                  </label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    value={draftForm.base_cost}
                    onChange={(e) =>
                      setDraftForm({ ...draftForm, base_cost: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Audience Retention</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {Math.round(draftForm.completion_rate * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={draftForm.completion_rate}
                    onChange={(e) =>
                      setDraftForm({ ...draftForm, completion_rate: parseFloat(e.target.value) })
                    }
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Exit Velocity (WOM)</span>
                    <span className="font-mono text-indigo-400 font-bold">
                      {draftForm.word_of_mouth_score} / 10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.1"
                    value={draftForm.word_of_mouth_score}
                    onChange={(e) =>
                      setDraftForm({
                        ...draftForm,
                        word_of_mouth_score: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Rewrite Penalty</span>
                    <span className="font-mono text-rose-400 font-bold">
                      {Math.round(draftForm.rewrite_ratio * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={draftForm.rewrite_ratio}
                    onChange={(e) =>
                      setDraftForm({ ...draftForm, rewrite_ratio: parseFloat(e.target.value) })
                    }
                    className="w-full accent-rose-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">IP Reliance</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.round(draftForm.ip_strength * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={draftForm.ip_strength}
                    onChange={(e) =>
                      setDraftForm({ ...draftForm, ip_strength: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>

              {/* Projected Metric Box */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-around text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Projected WAR
                  </span>
                  <span className="text-xl font-mono font-black text-emerald-400">
                    {projectedDraftWar.war}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Value ROI
                  </span>
                  <span className="text-xl font-mono font-black text-amber-400">
                    {projectedDraftWar.value}x
                  </span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDraftModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={draftSubmitting}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2 rounded-lg text-xs shadow-lg shadow-emerald-500/20"
                >
                  {draftSubmitting ? 'Drafting...' : 'Commit to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Methodology Reference Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="text-emerald-400" size={20} />
                <h3 className="font-black text-lg text-white uppercase tracking-tight">
                  Sabermetrics Translation Guide: Baseball to Hollywood &amp; Publishing
                </h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <p>
                In modern baseball, Sabermetrics isolates individual performance from team luck,
                stadium park factors, and environment to quantify true wins created. Applying this
                to creative talent replaces vanity metrics (box office totals, bestseller lists)
                with empirical value creation:
              </p>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3">Baseball Category</th>
                      <th className="p-3">MLB Statistic</th>
                      <th className="p-3">Creative Counterpart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                    <tr>
                      <td className="p-3 font-semibold text-white">Context Independence</td>
                      <td className="p-3 font-mono text-indigo-400">FIP / wRC+</td>
                      <td className="p-3">
                        <strong>Context-Independent Lift:</strong> Strips away franchise IP crutch
                        and inflated marketing budgets. Measures organic yield.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Process vs. Outcome</td>
                      <td className="p-3 font-mono text-emerald-400">Statcast xBA, xSLG</td>
                      <td className="p-3">
                        <strong>Expected Engagement (xEngagement):</strong> Audience completion
                        percentage + Organic Word-of-Mouth exit velocity.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Efficiency &amp; Discipline</td>
                      <td className="p-3 font-mono text-rose-400">OBP / BB% &amp; K%</td>
                      <td className="p-3">
                        <strong>Production Efficiency Rating:</strong> Low rewrite ratio, clean
                        drafts, on-schedule delivery without costly reshoots.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">The Holy Grail</td>
                      <td className="p-3 font-mono text-amber-400">WAR (Wins Above Replacement)</td>
                      <td className="p-3">
                        <strong>Creative WAR:</strong> Net value contribution relative to a $75k
                        union-minimum journeyman creator.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-white block uppercase tracking-wider text-[11px]">
                  The Core Valuation Algorithm
                </span>
                <code className="text-emerald-400 font-mono text-xs block bg-slate-900 p-2.5 rounded border border-slate-800">
                  Creative WAR = (Completion Rate × 10 + WOM Exit Velocity) × (1.0 - IP Reliance × 0.5) - (Rewrite Ratio × 3.0)
                </code>
                <code className="text-amber-400 font-mono text-xs block bg-slate-900 p-2.5 rounded border border-slate-800">
                  Value ROI Rating = Creative WAR ÷ max(1.0, Hiring Cost ÷ $100,000)
                </code>
              </div>

              <p className="text-slate-400">
                By evaluating talent through this framework, a studio can discover hidden indie
                filmmakers or obscure writers whose raw exit velocity is buried behind small
                distribution budgets—signing high-WAR assets at below-market rates.
              </p>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowGuideModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kaggle Data Pipeline & Ingestion Center Modal */}
      {showPipelineModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white uppercase tracking-tight flex items-center gap-2">
                    Kaggle Ingestion &amp; Data Pipeline
                  </h3>
                  <a
                    href="https://www.kaggle.com/datasets/rounakbanik/the-movies-dataset"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-0.5"
                  >
                    The Movies Dataset by Rounak Banik (45,000+ films) <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              <button
                onClick={() => setShowPipelineModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900 px-5 text-xs font-bold">
              <button
                onClick={() => setPipelineTab('upload')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  pipelineTab === 'upload'
                    ? 'border-indigo-400 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud size={14} /> Import CSV
              </button>
              <button
                onClick={() => setPipelineTab('simulate')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  pipelineTab === 'simulate'
                    ? 'border-indigo-400 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <RefreshCw size={14} /> Run Kaggle Pipeline Demo
              </button>
              <button
                onClick={() => setPipelineTab('script')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  pipelineTab === 'script'
                    ? 'border-indigo-400 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Code size={14} /> Python Ingestion Script
              </button>
              <button
                onClick={() => setPipelineTab('formulas')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  pipelineTab === 'formulas'
                    ? 'border-indigo-400 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <FileText size={14} /> Data Provenance
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {pipelineTab === 'upload' && (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white text-sm">Upload Pre-Computed Talent or Custom CSV</h4>
                    <p className="text-slate-400">
                      Upload any CSV with columns: <code className="text-indigo-400">name, role, completion_rate, word_of_mouth_score, rewrite_ratio, ip_strength, base_cost</code>.
                      PapaParse reads the file in your browser and automatically updates the database.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-8 text-center bg-slate-950/60 transition flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                      <UploadCloud size={28} />
                    </div>
                    <div>
                      <span className="font-bold text-white block text-sm">Select CSV File to Import</span>
                      <span className="text-slate-500 text-xs">Supports UTF-8 CSV exports from Kaggle, Excel, or custom models</span>
                    </div>

                    <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition inline-block">
                      Browse Files
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>

                  {uploadStatus && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-xs">
                      {uploadStatus}
                    </div>
                  )}
                </div>
              )}

              {pipelineTab === 'simulate' && (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white text-sm">
                      1-Click Kaggle Algorithm Execution Simulation
                    </h4>
                    <p className="text-slate-400">
                      Executes the Kaggle ingestion script across sample film productions (Toy Story,
                      Pulp Fiction, The Dark Knight, Lady Bird, Get Out). Watch the
                      exact merging of metadata and credits JSON, derivation of Sabermetric ratios,
                      and database commit in real time.
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={runKaggleSimulation}
                      disabled={simulating}
                      className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-lg text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <RefreshCw size={14} className={simulating ? 'animate-spin' : ''} />
                      {simulating ? 'Running Pipeline...' : 'Run Kaggle Ingestion Pipeline'}
                    </button>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Threshold: vote_count &ge; 2
                    </span>
                  </div>

                  {simulationLogs.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-64 overflow-y-auto">
                      {simulationLogs.map((log, i) => (
                        <div key={i} className="leading-relaxed">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {pipelineTab === 'script' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white text-sm">Python Ingestion Source Script</h4>
                      <p className="text-slate-400">Saved to <code className="text-indigo-400">scripts/ingest.py</code> for local execution.</p>
                    </div>
                    <button
                      onClick={copyScriptText}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      {copiedCode ? 'Copied' : 'Copy Script'}
                    </button>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-96">
                    <pre>{`import os, ast, json
import pandas as pd
from tqdm import tqdm

base_path = "movie_data"

def parse_crew_safely(crew_str):
    if pd.isna(crew_str) or not isinstance(crew_str, str): return []
    try: return ast.literal_eval(crew_str)
    except:
        try: return json.loads(crew_str)
        except: return []

def run_sabermetric_ingestion():
    meta_df = pd.read_csv(f"{base_path}/movies_metadata.csv", low_memory=False)
    credits_df = pd.read_csv(f"{base_path}/credits.csv")
    merged_df = pd.merge(meta_df, credits_df, on='id')

    for _, row in tqdm(merged_df.iterrows(), total=merged_df.shape[0]):
        vote_avg = pd.to_numeric(row.get('vote_average'), errors='coerce')
        vote_count = pd.to_numeric(row.get('vote_count'), errors='coerce')
        budget = pd.to_numeric(row.get('budget'), errors='coerce')
        if vote_count < 2: continue

        # 1. Retention rate (0.0 to 1.0)
        derived_retention = min(1.0, max(0.0, float(vote_avg) / 10.0))
        # 2. Organic WOM velocity (1.0 to 10.0)
        derived_wom = min(10.0, max(1.0, 1.0 + (float(vote_count) / 1500.0) * 9.0))
        # 3. Franchise reliance IP factor (0.0 or 1.0)
        is_franchise = 1.0 if pd.notna(row.get('belongs_to_collection')) else 0.0

        # ... aggregates filmmakers into talent profiles ...`}</pre>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-400">
                    <strong className="text-white block mb-1">To run on your local machine:</strong>
                    <code>pip install pandas tqdm sqlmodel</code>
                    <br />
                    <code>python scripts/ingest.py</code>
                  </div>
                </div>
              )}

              {pipelineTab === 'formulas' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-white text-sm">Mathematical Derivation Mappings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-emerald-400 font-bold block uppercase text-[10px]">
                        1. Audience Retention %
                      </span>
                      <code className="text-white font-mono block bg-slate-900 p-2 rounded">
                        retention = vote_avg / 10.0
                      </code>
                      <p className="text-slate-400">
                        Normalized viewer score mapped to a 0.0–1.0 decimal percentage measuring
                        quality of contact.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-indigo-400 font-bold block uppercase text-[10px]">
                        2. Organic Exit Velocity (WOM)
                      </span>
                      <code className="text-white font-mono block bg-slate-900 p-2 rounded">
                        wom = 1.0 + (vote_count / 1500) * 9.0
                      </code>
                      <p className="text-slate-400">
                        Measures organic word-of-mouth velocity and viral lift based on critical mass of reviews.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-amber-400 font-bold block uppercase text-[10px]">
                        3. Franchise IP Reliance
                      </span>
                      <code className="text-white font-mono block bg-slate-900 p-2 rounded">
                        is_franchise = belongs_to_collection != ""
                      </code>
                      <p className="text-slate-400">
                        Park Factor variable discounting individual WAR if the movie rides an established franchise IP.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-rose-400 font-bold block uppercase text-[10px]">
                        4. Base Salary &amp; Rewrite Penalty
                      </span>
                      <code className="text-white font-mono block bg-slate-900 p-2 rounded">
                        cost = max(75000, avg_budget * 0.02)
                      </code>
                      <p className="text-slate-400">
                        Option salary based on budget scale; rewrite variance = 0.15 for &gt;3 projects, else 0.05.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowPipelineModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition"
              >
                Close Pipeline Center
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
