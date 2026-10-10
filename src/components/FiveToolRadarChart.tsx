import React, { useState, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Shield, Sparkles, Award, SlidersHorizontal, Info, UserCheck, ArrowRight } from 'lucide-react';

export interface FiveToolTalentInput {
  id?: string;
  name?: string;
  role?: string;
  completion_rate: number;
  word_of_mouth_score: number;
  rewrite_ratio: number;
  ip_strength: number;
  base_cost: number;
  creative_war?: number;
  regressed_war?: number;
  creative_wrc_plus?: number;
  career_consistency?: number;
}

export interface FiveToolRadarChartProps {
  talent: FiveToolTalentInput;
  compareTalent?: FiveToolTalentInput | null;
  onSelectCompare?: (talent: FiveToolTalentInput | null) => void;
  availableComps?: FiveToolTalentInput[];
  title?: string;
  subtitle?: string;
  showBenchmarksDefault?: boolean;
  compact?: boolean;
}

// League baseline benchmarks across the 41,758 historical cohort
export const LEAGUE_AVERAGE_FIVE_TOOLS = {
  completion_rate: 0.65, // 65%
  word_of_mouth_score: 6.84, // 6.84 / 10
  rewrite_ratio: 0.12, // 12% rewrite penalty -> 88% efficiency
  ip_strength: 0.48, // 48% franchise weight
  base_cost: 245000, // $245k average base cost
};

// Converts 0-100 rating to standard MLB / Sabermetric 20-80 Scouting Grade
export function calculateScoutingGrade(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return Math.round(20 + (clamped / 100) * 60);
}

export function getScoutingGradeLabel(grade: number): { label: string; color: string } {
  if (grade >= 75) return { label: 'Elite (80)', color: 'text-emerald-400' };
  if (grade >= 65) return { label: 'Plus Plus (70)', color: 'text-teal-400' };
  if (grade >= 55) return { label: 'Plus (60)', color: 'text-sky-400' };
  if (grade >= 48) return { label: 'MLB Average (50)', color: 'text-slate-300' };
  if (grade >= 38) return { label: 'Below Avg (40)', color: 'text-amber-400' };
  return { label: 'Fringe (30)', color: 'text-rose-400' };
}

// Determines the Scouting Archetype based on 5-tool polygon geometry
export function deriveScoutingArchetype(scores: {
  completion: number;
  wom: number;
  efficiency: number;
  ip: number;
  costValue: number;
}): { title: string; badge: string; description: string; color: string } {
  const { completion, wom, efficiency, ip, costValue } = scores;
  const avg = (completion + wom + efficiency + ip + costValue) / 5;

  if (completion >= 75 && wom >= 75 && efficiency >= 75 && costValue >= 70) {
    return {
      title: '5-Tool Franchise Phenom',
      badge: 'Tier 1 All-Star',
      description: 'Excels across every dimension: retention, viral exit velocity, clean execution, and high surplus value.',
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
  }
  if (costValue >= 80 && efficiency >= 80) {
    return {
      title: 'Moneyball Value Sleeper',
      badge: 'Surplus Arbitrage',
      description: 'High craft discipline and low budget overhead create exceptional surplus WAR per dollar.',
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    };
  }
  if (wom >= 80 && completion >= 75) {
    return {
      title: 'High-Ceiling Auteur',
      badge: 'Audience Magnet',
      description: 'Generates immense word-of-mouth exit velocity and high retention; commands marquee audience engagement.',
      color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    };
  }
  if (ip >= 75) {
    return {
      title: 'Franchise IP Anchor',
      badge: 'Universe Specialist',
      description: 'Proven track record steering multi-tier franchise universes with high commercial stability.',
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
  }
  if (efficiency >= 85) {
    return {
      title: 'Precision Script Doctor',
      badge: 'Turnaround Ace',
      description: 'Minimal rewrite friction and laser-focused execution reliably protect shooting schedules.',
      color: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    };
  }
  if (avg >= 60) {
    return {
      title: 'Everyday Solid Contender',
      badge: 'Reliable Regular',
      description: 'Well-rounded creative profile with stable baseline production above industry replacement.',
      color: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    };
  }
  return {
    title: 'Developmental High-Variance',
    badge: 'Volatile Project',
    description: 'Niche profile requiring targeted team support and rigorous script development guardrails.',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };
}

export function formatTalentToFiveTools(
  t: FiveToolTalentInput,
  costMode: 'value' | 'marketTier' = 'value'
) {
  const completionRaw = Number(t.completion_rate) || 0;
  const womRaw = Number(t.word_of_mouth_score) || 0;
  const rewriteRaw = Number(t.rewrite_ratio) || 0;
  const ipRaw = Number(t.ip_strength) || 0;
  const costRaw = Number(t.base_cost) || 75000;

  // 1. Completion Rate: 0 to 100
  const completionScore = Math.max(0, Math.min(100, Math.round(completionRaw * 100)));

  // 2. WOM Score: 0 to 100 (scaled from 1-10)
  const womScore = Math.max(0, Math.min(100, Math.round((womRaw / 10) * 100)));

  // 3. Efficiency: 0 to 100 (1.0 - rewrite_ratio)
  const efficiencyScore = Math.max(0, Math.min(100, Math.round((1.0 - rewriteRaw) * 100)));

  // 4. IP Strength: 0 to 100
  const ipScore = Math.max(0, Math.min(100, Math.round(ipRaw * 100)));

  // 5. Cost Index:
  // - Value Index (Default): Lower cost produces higher capital efficiency score
  // - Market Tier: Higher cost reflects top market tier
  const costValueScore = Math.max(
    10,
    Math.min(100, Math.round(100 - (costRaw / 2000000) * 85))
  );
  const costMarketTierScore = Math.max(
    10,
    Math.min(100, Math.round((costRaw / 1500000) * 100))
  );
  const costIndexScore = costMode === 'value' ? costValueScore : costMarketTierScore;

  return {
    completionScore,
    womScore,
    efficiencyScore,
    ipScore,
    costIndexScore,
    costValueScore,
    rawValues: {
      completion: `${(completionRaw * 100).toFixed(1)}%`,
      wom: `${womRaw.toFixed(1)} / 10`,
      efficiency: `${(rewriteRaw * 100).toFixed(1)}% rewrite (${efficiencyScore}% craft)`,
      ip: `${(ipRaw * 100).toFixed(0)}% leverage`,
      cost: `$${costRaw.toLocaleString()}`,
    },
  };
}

export const FiveToolRadarChart: React.FC<FiveToolRadarChartProps> = ({
  talent,
  compareTalent,
  onSelectCompare,
  availableComps = [],
  title = 'Creative Five-Tool Scouting Radar',
  subtitle = 'Evaluating core craft capabilities on the standardized 20-80 scouting scale',
  showBenchmarksDefault = true,
  compact = false,
}) => {
  const [showBenchmark, setShowBenchmark] = useState<boolean>(showBenchmarksDefault);
  const [costMode, setCostMode] = useState<'value' | 'marketTier'>('value');
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Compute primary talent 5-tools
  const primaryTools = useMemo(
    () => formatTalentToFiveTools(talent, costMode),
    [talent, costMode]
  );

  // Compute compare talent 5-tools (if any)
  const secondaryTools = useMemo(
    () => (compareTalent ? formatTalentToFiveTools(compareTalent, costMode) : null),
    [compareTalent, costMode]
  );

  // Compute League Average 5-tools
  const leagueTools = useMemo(
    () =>
      formatTalentToFiveTools(
        {
          name: 'League Average',
          completion_rate: LEAGUE_AVERAGE_FIVE_TOOLS.completion_rate,
          word_of_mouth_score: LEAGUE_AVERAGE_FIVE_TOOLS.word_of_mouth_score,
          rewrite_ratio: LEAGUE_AVERAGE_FIVE_TOOLS.rewrite_ratio,
          ip_strength: LEAGUE_AVERAGE_FIVE_TOOLS.ip_strength,
          base_cost: LEAGUE_AVERAGE_FIVE_TOOLS.base_cost,
        },
        costMode
      ),
    [costMode]
  );

  // Prepare Recharts dataset
  const chartData = useMemo(() => {
    return [
      {
        tool: 'Completion Rate',
        shortName: 'Completion',
        fullDescription: 'Audience story retention & finish probability',
        subject: 'Completion Rate',
        score: primaryTools.completionScore,
        rawDisplay: primaryTools.rawValues.completion,
        compareScore: secondaryTools?.completionScore,
        compareRaw: secondaryTools?.rawValues.completion,
        leagueAvg: leagueTools.completionScore,
        grade: calculateScoutingGrade(primaryTools.completionScore),
        fullMark: 100,
        color: '#10b981', // emerald
      },
      {
        tool: 'WOM Score',
        shortName: 'WOM Buzz',
        fullDescription: 'Organic exit velocity & word-of-mouth multiplier',
        subject: 'WOM Score',
        score: primaryTools.womScore,
        rawDisplay: primaryTools.rawValues.wom,
        compareScore: secondaryTools?.womScore,
        compareRaw: secondaryTools?.rawValues.wom,
        leagueAvg: leagueTools.womScore,
        grade: calculateScoutingGrade(primaryTools.womScore),
        fullMark: 100,
        color: '#6366f1', // indigo
      },
      {
        tool: 'Efficiency',
        shortName: 'Efficiency',
        fullDescription: 'Production discipline & inverse rewrite penalty (1 - rewrite)',
        subject: 'Efficiency',
        score: primaryTools.efficiencyScore,
        rawDisplay: primaryTools.rawValues.efficiency,
        compareScore: secondaryTools?.efficiencyScore,
        compareRaw: secondaryTools?.rawValues.efficiency,
        leagueAvg: leagueTools.efficiencyScore,
        grade: calculateScoutingGrade(primaryTools.efficiencyScore),
        fullMark: 100,
        color: '#14b8a6', // teal
      },
      {
        tool: 'IP Strength',
        shortName: 'IP Strength',
        fullDescription: 'Franchise leverage & multi-tier universe adaptability',
        subject: 'IP Strength',
        score: primaryTools.ipScore,
        rawDisplay: primaryTools.rawValues.ip,
        compareScore: secondaryTools?.ipScore,
        compareRaw: secondaryTools?.rawValues.ip,
        leagueAvg: leagueTools.ipScore,
        grade: calculateScoutingGrade(primaryTools.ipScore),
        fullMark: 100,
        color: '#f59e0b', // amber
      },
      {
        tool: costMode === 'value' ? 'Cost Index (Value)' : 'Cost Index (Tier)',
        shortName: 'Cost Index',
        fullDescription:
          costMode === 'value'
            ? 'Capital efficiency & surplus value per $100k invested'
            : 'Market cost tier relative to industry maximum ($2M ceiling)',
        subject: 'Cost Index',
        score: primaryTools.costIndexScore,
        rawDisplay: primaryTools.rawValues.cost,
        compareScore: secondaryTools?.costIndexScore,
        compareRaw: secondaryTools?.rawValues.cost,
        leagueAvg: leagueTools.costIndexScore,
        grade: calculateScoutingGrade(primaryTools.costIndexScore),
        fullMark: 100,
        color: '#06b6d4', // cyan
      },
    ];
  }, [primaryTools, secondaryTools, leagueTools, costMode]);

  // Overall Scouting Archetype
  const archetype = useMemo(
    () =>
      deriveScoutingArchetype({
        completion: primaryTools.completionScore,
        wom: primaryTools.womScore,
        efficiency: primaryTools.efficiencyScore,
        ip: primaryTools.ipScore,
        costValue: primaryTools.costValueScore,
      }),
    [primaryTools]
  );

  const averageGrade = useMemo(() => {
    const sum = chartData.reduce((acc, cur) => acc + cur.grade, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  const talentName = talent.name || 'Selected Talent';
  const compareName = compareTalent?.name || 'Comparison Talent';

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="text-emerald-400" size={18} />
            <h4 className="text-base font-black text-white">{title}</h4>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${archetype.color}`}
            >
              {archetype.badge}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        {/* Controls Deck */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* League Benchmark Toggle */}
          <button
            type="button"
            onClick={() => setShowBenchmark((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
              showBenchmark
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle League Average Overlay"
          >
            <Sparkles size={12} className={showBenchmark ? 'text-amber-400' : 'text-slate-500'} />
            <span>League Avg</span>
          </button>

          {/* Cost Mode Toggle */}
          <button
            type="button"
            onClick={() =>
              setCostMode((prev) => (prev === 'value' ? 'marketTier' : 'value'))
            }
            className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg transition flex items-center gap-1.5 font-mono"
            title="Toggle Cost Calculation Interpretation"
          >
            <SlidersHorizontal size={12} className="text-cyan-400" />
            <span>{costMode === 'value' ? 'Cost: Value Yield' : 'Cost: Tier Scale'}</span>
          </button>

          {/* Quick Comp Selector (if availableComps provided) */}
          {availableComps.length > 0 && onSelectCompare && (
            <select
              value={compareTalent?.id || ''}
              onChange={(e) => {
                const found = availableComps.find((c) => c.id === e.target.value);
                onSelectCompare(found || null);
              }}
              className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="">Compare vs Peer...</option>
              {availableComps.map((c) => (
                <option key={c.id} value={c.id}>
                  vs {c.name} ({c.creative_war ?? '—'} WAR)
                </option>
              ))}
            </select>
          )}

          {compareTalent && onSelectCompare && (
            <button
              type="button"
              onClick={() => onSelectCompare(null)}
              className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-950/30 border border-rose-800/40 rounded-lg"
            >
              Clear Comp
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Radar Chart + Scouting Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Radar Chart Display (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative min-h-[320px] bg-slate-900/40 rounded-xl p-2 border border-slate-800/50">
          <div className="w-full h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={({ x, y, payload }) => {
                    const isHovered = activeTool === payload.value;
                    return (
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        fill={isHovered ? '#34d399' : '#94a3b8'}
                        fontSize={11}
                        fontWeight={isHovered ? 700 : 600}
                        className="transition-colors cursor-pointer"
                        onClick={() => setActiveTool(payload.value)}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  tickCount={5}
                />

                {/* League Average Polygon */}
                {showBenchmark && (
                  <Radar
                    name="League Average (Historical Cohort)"
                    dataKey="leagueAvg"
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    fill="#f59e0b"
                    fillOpacity={0.12}
                  />
                )}

                {/* Comparison Talent Polygon */}
                {compareTalent && secondaryTools && (
                  <Radar
                    name={`${compareName} (Peer Comp)`}
                    dataKey="compareScore"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="#a855f7"
                    fillOpacity={0.25}
                  />
                )}

                {/* Selected Talent Primary Polygon */}
                <Radar
                  name={`${talentName} (Subject)`}
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="#10b981"
                  fillOpacity={0.35}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload;
                      const gradeInfo = getScoutingGradeLabel(dataPoint.grade);
                      return (
                        <div className="bg-slate-900 border border-slate-700/90 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 max-w-xs z-50">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <strong className="text-white text-sm font-black">
                              {dataPoint.tool}
                            </strong>
                            <span className="text-[10px] font-mono text-slate-400">
                              Max 100
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{dataPoint.fullDescription}</p>

                          <div className="space-y-1 pt-1 font-mono text-xs">
                            <div className="flex justify-between items-center text-emerald-400">
                              <span className="font-sans text-slate-300 font-bold">
                                {talentName}:
                              </span>
                              <span>
                                {dataPoint.score}/100 ({dataPoint.rawDisplay})
                              </span>
                            </div>

                            {compareTalent && dataPoint.compareScore !== undefined && (
                              <div className="flex justify-between items-center text-purple-400">
                                <span className="font-sans text-slate-300 font-bold">
                                  {compareName}:
                                </span>
                                <span>
                                  {dataPoint.compareScore}/100 ({dataPoint.compareRaw})
                                </span>
                              </div>
                            )}

                            {showBenchmark && (
                              <div className="flex justify-between items-center text-amber-400/90">
                                <span className="font-sans text-slate-400">League Avg:</span>
                                <span>{dataPoint.leagueAvg}/100</span>
                              </div>
                            )}
                          </div>

                          <div className="border-t border-slate-800/80 pt-1.5 flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">Scouting Grade:</span>
                            <span className={`font-black font-mono ${gradeInfo.color}`}>
                              Grade {dataPoint.grade} ({gradeInfo.label})
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => <span className="text-slate-300">{value}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full flex items-center justify-between px-2 pt-1 text-[11px] text-slate-500">
            <span>Center = Replacement (0)</span>
            <span className="font-mono text-emerald-400">Outer Ring = Elite Auteur (100)</span>
          </div>
        </div>

        {/* Scouting Synthesis Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Overall Archetype Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Award size={13} className="text-amber-400" />
                Scouting Archetype
              </span>
              <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                Avg Grade: {averageGrade}
              </span>
            </div>

            <div>
              <h5 className="text-lg font-black text-white">{archetype.title}</h5>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {archetype.description}
              </p>
            </div>

            {/* Quick Metrics Comparison against League Avg */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Overall Tool Score</span>
                <span className="text-base font-black font-mono text-emerald-400 block mt-0.5">
                  {Math.round(
                    (primaryTools.completionScore +
                      primaryTools.womScore +
                      primaryTools.efficiencyScore +
                      primaryTools.ipScore +
                      primaryTools.costIndexScore) /
                      5
                  )}
                  /100
                </span>
                <span className="text-[10px] text-slate-500 block">
                  vs 61/100 League Mean
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Surplus Efficiency</span>
                <span className="text-base font-black font-mono text-cyan-400 block mt-0.5">
                  {primaryTools.costValueScore}/100
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Capital Return Index
                </span>
              </div>
            </div>
          </div>

          {/* Bill James Scouting Tip */}
          <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-3 text-xs text-emerald-300/90 flex gap-2.5 items-start">
            <Info size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white block font-semibold">
                Sabermetric 5-Tool Interpretation
              </strong>
              <p className="text-[11px] text-slate-300 leading-snug">
                Unlike raw box-office metrics which confuse studio brand leverage with genuine
                talent, this 5-Tool Radar balances pure audience retention and organic WOM with
                production efficiency and hiring cost.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* The Five Tools Detailed Breakdown Deck */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-400" />
            Five-Tool Component Grades &amp; Empirical Values
          </h5>
          <span className="text-[11px] text-slate-500">
            Hover or click to highlight axis
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {chartData.map((item) => {
            const isSelected = activeTool === item.subject;
            const gradeInfo = getScoutingGradeLabel(item.grade);
            const deltaVsLeague = item.score - item.leagueAvg;

            return (
              <div
                key={item.subject}
                onMouseEnter={() => setActiveTool(item.subject)}
                onMouseLeave={() => setActiveTool(null)}
                className={`bg-slate-900 border p-3 rounded-xl transition cursor-pointer space-y-2 ${
                  isSelected
                    ? 'border-emerald-500/80 bg-slate-850 shadow-lg'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-white block">
                      {item.shortName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.rawDisplay}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 ${gradeInfo.color}`}
                  >
                    Gr. {item.grade}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.score}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                    <span>{item.score}/100</span>
                    <span
                      className={
                        deltaVsLeague >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {deltaVsLeague >= 0 ? `+${deltaVsLeague}` : deltaVsLeague} vs Avg
                    </span>
                  </div>
                </div>

                {/* Comp Talent value if comparison active */}
                {compareTalent && item.compareScore !== undefined && (
                  <div className="pt-1.5 border-t border-slate-800/80 flex justify-between items-center text-[10px]">
                    <span className="text-purple-400 truncate max-w-[80px]">
                      {compareName}:
                    </span>
                    <span className="font-mono text-purple-300 font-bold">
                      {item.compareScore}/100
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FiveToolRadarChart;
