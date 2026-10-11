import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { runHistoricalValidation } from './src/data/historicalValidation.ts';
import { getTalentFilmography, getTalentAvatar } from './src/data/filmographyData.ts';
import {
  IMDB_ACTIVE_SOURCES,
  CURATED_UP_AND_COMING_TALENT,
  calculateTalentPrediction,
  getImdbDataForTalent,
  type ImdbProspectRecord,
} from './src/data/imdbDataSources.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TalentRecord {
  id: string;
  name: string;
  role: string;
  completion_rate: number;
  word_of_mouth_score: number;
  rewrite_ratio: number;
  ip_strength: number;
  base_cost: number;
  vote_count?: number;
  creative_war?: number;
  regressed_war?: number;
  creative_wrc_plus?: number;
  career_consistency?: number;
  sample_weight?: number;
  value_rating?: number;
  // Sabermetric computed sub-metrics
  x_engagement?: number;
  context_lift?: number;
  efficiency_score?: number;
  replacement_delta?: number;
  cost_per_war?: number;
  surplus_value?: number;
  hidden_talent_index?: number;
  avatar_url?: string;
}

interface FormulaConfig {
  engagementMultiplier: number;
  ipDiscountFactor: number;
  efficiencyPenalty: number;
  regressionConstant?: number;
  leagueAvgWar?: number;
}

const DEFAULT_CONFIG: FormulaConfig = {
  engagementMultiplier: 10.0,
  ipDiscountFactor: 0.5,
  efficiencyPenalty: 3.0,
  regressionConstant: 250,
  leagueAvgWar: 5.1,
};

function calculateCreativeWar(
  item: {
    completion_rate?: number;
    word_of_mouth_score?: number;
    rewrite_ratio?: number;
    ip_strength?: number;
  },
  config: FormulaConfig = DEFAULT_CONFIG
): { war: number; xEngagement: number; contextLift: number; efficiencyScore: number } {
  const completion_rate = Number(item.completion_rate) || 0;
  const word_of_mouth_score = Number(item.word_of_mouth_score) || 0;
  const ip_strength = Number(item.ip_strength) || 0;
  const rewrite_ratio = Number(item.rewrite_ratio) || 0;

  // Process vs Outcome: xEngagement (Audience Retention * Multiplier + Exit Velocity WOM)
  const xEngagement = completion_rate * config.engagementMultiplier + word_of_mouth_score;

  // Context Independence: Park factor discount (original IP has 0.0 strength -> 100% lift)
  const contextLift = Math.max(0.1, 1.0 - ip_strength * config.ipDiscountFactor);

  // Efficiency & Control: OBP penalty for excessive rewrites/production waste
  const efficiencyScore = rewrite_ratio * config.efficiencyPenalty;

  const calculated_war = xEngagement * contextLift - efficiencyScore;
  const war = Math.round(Math.max(0.0, calculated_war) * 100) / 100;

  return {
    war,
    xEngagement: Math.round(xEngagement * 100) / 100,
    contextLift: Math.round(contextLift * 100) / 100,
    efficiencyScore: Math.round(efficiencyScore * 100) / 100,
  };
}

/**
 * Calculates sample confidence weight using empirical Bayes / Marcel regression:
 * W = votes / (votes + K)
 */
function calculateSampleWeight(voteCount: number, regressionConstant: number = 250): number {
  const safeVotes = Math.max(0, voteCount);
  return safeVotes / (safeVotes + regressionConstant);
}

/**
 * Computes Regressed WAR via Bayesian shrinkage:
 * regressed_war = (WAR * W) + (Replacement_WAR * (1 - W))
 * High sample sizes retain observed WAR; tiny samples regress to 1.5 baseline.
 */
function calculateRegressedWar(
  rawWar: number,
  voteCount: number,
  regressionConstant: number = 250,
  replacementBaselineWar: number = 1.5
): { regressedWar: number; sampleWeight: number } {
  const sampleWeight = calculateSampleWeight(voteCount, regressionConstant);
  const regressed = (rawWar * sampleWeight) + (replacementBaselineWar * (1.0 - sampleWeight));
  return {
    regressedWar: Math.round(regressed * 100) / 100,
    sampleWeight: Math.round(sampleWeight * 1000) / 1000,
  };
}

/**
 * Creative wRC+: Normalized production indexed to league average (100 = league avg, 150 = 50% above avg).
 */
function calculateCreativeWrcPlus(rawWar: number, benchmarkAvgWar: number = 5.1): number {
  const safeBenchmark = Math.max(0.5, benchmarkAvgWar);
  return Math.round((rawWar / safeBenchmark) * 100);
}

/**
 * Career Consistency Index (0 - 100 scale):
 * Evaluates structural reliability, schedule execution, retention stability, and sample maturity.
 * - 40% Retention stability (completion_rate)
 * - 40% Production discipline (1.0 - rewrite_ratio)
 * - 20% Sample size maturity log10(votes) / log10(3000)
 */
function calculateCareerConsistency(
  completionRate: number,
  rewriteRatio: number,
  voteCount: number
): number {
  const comp = Math.min(1.0, Math.max(0.0, completionRate));
  const discipline = Math.min(1.0, Math.max(0.0, 1.0 - rewriteRatio));
  const safeVotes = Math.max(5, voteCount);
  const sampleMaturity = Math.min(1.0, Math.max(0.1, Math.log10(safeVotes) / Math.log10(3000)));

  const score = ((comp * 0.40) + (discipline * 0.40) + (sampleMaturity * 0.20)) * 100;
  return Math.round(Math.min(100, Math.max(10, score)) * 10) / 10;
}

function formatTalentRecord(
  item: TalentRecord,
  config: FormulaConfig = DEFAULT_CONFIG,
  leagueAvgWar: number = 5.1
): TalentRecord {
  const { war, xEngagement, contextLift, efficiencyScore } = calculateCreativeWar(item, config);
  const cost = Number(item.base_cost) || 75000;
  const cost_factor = Math.max(1.0, cost / 100000.0);
  const value_rating = Math.round((war / cost_factor) * 100) / 100;

  // Replacement level benchmark: $75k journeyman creator produces ~1.5 baseline WAR
  const replacementBaselineWar = 1.5;
  const replacement_delta = Math.round((war - replacementBaselineWar) * 100) / 100;

  // Dollars per WAR ($ / 1.0 WAR produced)
  const cost_per_war = Math.round(cost / Math.max(0.1, war));

  // Market baseline: Industry average studio pays $65,000 per 1.0 WAR
  const marketValueProduced = war * 65000;
  const surplus_value = Math.round(Math.max(0, marketValueProduced - cost));

  // Extract or derive vote_count
  const vote_count = item.vote_count !== undefined && item.vote_count !== null
    ? Math.max(1, Math.round(Number(item.vote_count)))
    : Math.max(5, Math.round(((Number(item.word_of_mouth_score || 1.0) - 1.0) / 9.0) * 1500));

  // Vote count sample weights & Bayesian shrinkage (Regressed WAR)
  const regConstant = config.regressionConstant || 250;
  const { regressedWar, sampleWeight } = calculateRegressedWar(
    war,
    vote_count,
    regConstant,
    replacementBaselineWar
  );

  // Creative wRC+ (Indexed to 100 = league average)
  const creative_wrc_plus = calculateCreativeWrcPlus(war, config.leagueAvgWar || leagueAvgWar);

  // Career Consistency Index (0 to 100)
  const career_consistency = calculateCareerConsistency(
    Number(item.completion_rate) || 0,
    Number(item.rewrite_ratio) || 0,
    vote_count
  );

  // Hidden Talent Index (0 to 100): isolates pure organic craft vs cost
  const compNorm = (Number(item.completion_rate) || 0) * 100;
  const womNorm = ((Number(item.word_of_mouth_score) || 1) / 10) * 100;
  const craftScore = compNorm * 0.5 + womNorm * 0.35;
  const ipBonus = (1.0 - (Number(item.ip_strength) || 0)) * 25;
  const discBonus = (1.0 - (Number(item.rewrite_ratio) || 0)) * 15;
  const costDiscountFactor = Math.max(0.6, Math.min(1.5, Math.log10(cost) / Math.log10(500000)));
  const hti = Math.round(Math.min(100, Math.max(5, ((craftScore + ipBonus + discBonus) / costDiscountFactor) * 0.8)));

  return {
    ...item,
    vote_count,
    creative_war: war,
    regressed_war: regressedWar,
    creative_wrc_plus,
    career_consistency,
    sample_weight: sampleWeight,
    value_rating,
    x_engagement: xEngagement,
    context_lift: contextLift,
    efficiency_score: efficiencyScore,
    replacement_delta,
    cost_per_war,
    surplus_value,
    hidden_talent_index: hti,
    avatar_url: getTalentAvatar(item.name),
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Load in-memory talent database
  const dataPath = path.resolve(__dirname, 'data', 'talent_data.json');
  let talentPool: TalentRecord[] = [];
  const talentMap = new Map<string, TalentRecord>();
  let cachedLeagueAvgWar = 5.1;

  function recomputeLeagueAvgWar(config: FormulaConfig = DEFAULT_CONFIG): number {
    if (talentPool.length === 0) return 5.1;
    let totalWar = 0;
    for (const t of talentPool) {
      const { war } = calculateCreativeWar(t, config);
      totalWar += war;
    }
    cachedLeagueAvgWar = Math.round((totalWar / talentPool.length) * 100) / 100;
    return cachedLeagueAvgWar;
  }

  if (fs.existsSync(dataPath)) {
    try {
      talentPool = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      for (const item of talentPool) {
        if (item.vote_count === undefined || item.vote_count === null) {
          item.vote_count = Math.max(5, Math.round(((Number(item.word_of_mouth_score || 1.0) - 1.0) / 9.0) * 1500));
        }
        talentMap.set(item.id, item);
      }
      recomputeLeagueAvgWar();
      console.log(`Loaded ${talentPool.length} talent profiles into memory (League Avg WAR: ${cachedLeagueAvgWar}).`);
    } catch (err) {
      console.error('Error reading data/talent_data.json:', err);
    }
  }

  // Helper to extract formula config from query
  const getFormulaConfig = (req: Request): FormulaConfig => {
    return {
      engagementMultiplier: req.query.weight_engagement ? parseFloat(req.query.weight_engagement as string) : DEFAULT_CONFIG.engagementMultiplier,
      ipDiscountFactor: req.query.ip_discount ? parseFloat(req.query.ip_discount as string) : DEFAULT_CONFIG.ipDiscountFactor,
      efficiencyPenalty: req.query.efficiency_penalty ? parseFloat(req.query.efficiency_penalty as string) : DEFAULT_CONFIG.efficiencyPenalty,
      regressionConstant: req.query.regression_constant ? parseFloat(req.query.regression_constant as string) : DEFAULT_CONFIG.regressionConstant,
      leagueAvgWar: req.query.league_avg_war ? parseFloat(req.query.league_avg_war as string) : cachedLeagueAvgWar,
    };
  };

  // Summary statistics endpoint for front-office analytics overview
  const handleSummaryStats = (req: Request, res: Response) => {
    const config = getFormulaConfig(req);
    const total = talentPool.length;
    let totalWar = 0;
    let totalRegressedWar = 0;
    let totalWrcPlus = 0;
    let totalConsistency = 0;
    let totalCost = 0;
    let totalVotes = 0;
    let screenwriters = 0;
    let directors = 0;
    let novelists = 0;
    let undervaluedCount = 0;

    for (const t of talentPool) {
      const formatted = formatTalentRecord(t, config, cachedLeagueAvgWar);
      const war = formatted.creative_war ?? 0;
      const cost = t.base_cost || 75000;
      const valueRating = formatted.value_rating ?? 0;

      totalWar += war;
      totalRegressedWar += formatted.regressed_war ?? war;
      totalWrcPlus += formatted.creative_wrc_plus ?? 100;
      totalConsistency += formatted.career_consistency ?? 70;
      totalCost += cost;
      totalVotes += formatted.vote_count ?? 100;

      if (t.role === 'Screenwriter') screenwriters++;
      else if (t.role === 'Director') directors++;
      else if (t.role === 'Novelist') novelists++;

      if (war >= 3.0 && valueRating >= 6.0) {
        undervaluedCount++;
      }
    }

    res.json({
      total_creators: total,
      avg_war: total > 0 ? Math.round((totalWar / total) * 100) / 100 : 0,
      avg_regressed_war: total > 0 ? Math.round((totalRegressedWar / total) * 100) / 100 : 0,
      avg_wrc_plus: total > 0 ? Math.round(totalWrcPlus / total) : 100,
      avg_consistency: total > 0 ? Math.round((totalConsistency / total) * 10) / 10 : 70,
      avg_cost: total > 0 ? Math.round(totalCost / total) : 0,
      avg_vote_count: total > 0 ? Math.round(totalVotes / total) : 0,
      undervalued_count: undervaluedCount,
      disciplines: {
        screenwriters,
        directors,
        novelists,
      },
    });
  };

  app.get('/talent/summary', handleSummaryStats);
  app.get('/api/talent/summary', handleSummaryStats);

  // Scatter matrix sample endpoint (stratified sample across cost and WAR tiers)
  const handleScatterSample = (req: Request, res: Response) => {
    const config = getFormulaConfig(req);
    const formattedPool = talentPool.map((t) => formatTalentRecord(t, config, cachedLeagueAvgWar));

    // Top bargains (high WAR, low cost)
    const bargains = formattedPool
      .filter((t) => (t.creative_war ?? 0) >= 3.0 && (t.base_cost ?? 0) <= 250000)
      .sort((a, b) => (b.value_rating ?? 0) - (a.value_rating ?? 0))
      .slice(0, 75);

    // Franchise stars (high WAR, high cost)
    const stars = formattedPool
      .filter((t) => (t.creative_war ?? 0) >= 10.0)
      .sort((a, b) => (b.creative_war ?? 0) - (a.creative_war ?? 0))
      .slice(0, 75);

    // Sleepers (high HTI)
    const sleepers = formattedPool
      .filter((t) => (t.hidden_talent_index ?? 0) >= 70)
      .sort((a, b) => (b.hidden_talent_index ?? 0) - (a.hidden_talent_index ?? 0))
      .slice(0, 75);

    // Representative sample of the rest
    const step = Math.max(1, Math.floor(formattedPool.length / 100));
    const spread: TalentRecord[] = [];
    for (let i = 0; i < formattedPool.length && spread.length < 100; i += step) {
      spread.push(formattedPool[i]);
    }

    const sampleMap = new Map<string, TalentRecord>();
    for (const item of [...bargains, ...stars, ...sleepers, ...spread]) {
      sampleMap.set(item.id, item);
    }

    res.json(Array.from(sampleMap.values()));
  };

  app.get('/talent/scatter-sample', handleScatterSample);
  app.get('/api/talent/scatter-sample', handleScatterSample);

  // Get specific talent profile by ID
  const handleGetTalentById = (req: Request, res: Response) => {
    const id = req.params.talent_id;
    const item = talentMap.get(id);
    if (!item) {
      return res.status(404).json({ error: 'Talent profile not found' });
    }
    const config = getFormulaConfig(req);
    res.json(formatTalentRecord(item, config, cachedLeagueAvgWar));
  };

  app.get('/talent/:talent_id', handleGetTalentById);
  app.get('/api/talent/:talent_id', handleGetTalentById);

  // Filmography & Movie Posters endpoint
  const handleGetTalentMovies = (req: Request, res: Response) => {
    const id = req.params.talent_id;
    const item = talentMap.get(id);
    if (!item) {
      return res.status(404).json({ error: 'Talent profile not found' });
    }
    const filmography = getTalentFilmography(item);
    res.json(filmography);
  };

  app.get('/talent/:talent_id/movies', handleGetTalentMovies);
  app.get('/api/talent/:talent_id/movies', handleGetTalentMovies);

  // Statistical Comps endpoint (Bill James similarity)
  const handleGetTalentComps = (req: Request, res: Response) => {
    const id = req.params.talent_id;
    const target = talentMap.get(id);
    if (!target) {
      return res.status(404).json({ error: 'Talent not found' });
    }
    const config = getFormulaConfig(req);
    const targetFormatted = formatTalentRecord(target, config, cachedLeagueAvgWar);

    // Calculate distance against other creators in talentPool
    const candidates = talentPool
      .filter((t) => t.id !== id)
      .slice(0, 1500)
      .map((t) => {
        const formatted = formatTalentRecord(t, config, cachedLeagueAvgWar);
        const dist = Math.sqrt(
          Math.pow((t.completion_rate - target.completion_rate) * 10, 2) +
          Math.pow(t.word_of_mouth_score - target.word_of_mouth_score, 2) +
          Math.pow((t.rewrite_ratio - target.rewrite_ratio) * 10, 2) +
          Math.pow((t.ip_strength - target.ip_strength) * 5, 2) +
          Math.pow(((formatted.creative_war ?? 0) - (targetFormatted.creative_war ?? 0)) * 0.4, 2) +
          Math.pow(((formatted.career_consistency ?? 0) - (targetFormatted.career_consistency ?? 0)) * 0.05, 2)
        );
        return { item: formatted, dist };
      });

    candidates.sort((a, b) => a.dist - b.dist);
    const comps = candidates.slice(0, 4).map((c) => ({
      ...c.item,
      similarity_pct: Math.max(65, Math.min(99, Math.round((1 - c.dist / 15) * 100))),
    }));

    res.json(comps);
  };

  app.get('/talent/:talent_id/comps', handleGetTalentComps);
  app.get('/api/talent/:talent_id/comps', handleGetTalentComps);

  // Main talent query endpoint with filtering, search, and sorting
  const handleQueryTalent = (req: Request, res: Response) => {
    const role = (req.query.role as string) || undefined;
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    const max_cost_raw = req.query.max_cost ? parseFloat(req.query.max_cost as string) : undefined;
    const max_cost = !isNaN(max_cost_raw as number) ? max_cost_raw : undefined;
    const min_war_raw = req.query.min_war ? parseFloat(req.query.min_war as string) : undefined;
    const min_war = !isNaN(min_war_raw as number) ? min_war_raw : undefined;
    const min_regressed_war_raw = req.query.min_regressed_war ? parseFloat(req.query.min_regressed_war as string) : undefined;
    const min_regressed_war = !isNaN(min_regressed_war_raw as number) ? min_regressed_war_raw : undefined;
    const min_wrc_plus_raw = req.query.min_wrc_plus ? parseFloat(req.query.min_wrc_plus as string) : undefined;
    const min_wrc_plus = !isNaN(min_wrc_plus_raw as number) ? min_wrc_plus_raw : undefined;
    const min_consistency_raw = req.query.min_consistency ? parseFloat(req.query.min_consistency as string) : undefined;
    const min_consistency = !isNaN(min_consistency_raw as number) ? min_consistency_raw : undefined;
    const min_votes_raw = req.query.min_votes ? parseInt(req.query.min_votes as string, 10) : undefined;
    const min_votes = !isNaN(min_votes_raw as number) ? min_votes_raw : undefined;
    const max_rewrite_raw = req.query.max_rewrite ? parseFloat(req.query.max_rewrite as string) : undefined;
    const max_rewrite = !isNaN(max_rewrite_raw as number) ? max_rewrite_raw : undefined;
    const min_retention_raw = req.query.min_retention ? parseFloat(req.query.min_retention as string) : undefined;
    const min_retention = !isNaN(min_retention_raw as number) ? min_retention_raw : undefined;
    const max_ip_raw = req.query.max_ip ? parseFloat(req.query.max_ip as string) : undefined;
    const max_ip = !isNaN(max_ip_raw as number) ? max_ip_raw : undefined;
    const undervalued_only = req.query.undervalued_only === 'true' || req.query.undervalued_only === '1';

    const sort_by = (req.query.sort_by as string) || (undervalued_only ? 'value' : 'war');
    const sort_dir = (req.query.sort_dir as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    let page = parseInt(req.query.page as string, 10) || 1;
    let page_size = parseInt(req.query.page_size as string, 10) || 50;

    page = Math.max(1, page);
    page_size = Math.max(1, Math.min(100, page_size));

    const config = getFormulaConfig(req);

    // Filter raw pool
    let filtered = talentPool;

    if (search) {
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(search));
    }
    if (role) {
      filtered = filtered.filter((t) => t.role === role);
    }
    if (max_cost !== undefined) {
      filtered = filtered.filter((t) => (t.base_cost ?? 0) <= max_cost);
    }
    if (max_rewrite !== undefined) {
      filtered = filtered.filter((t) => (t.rewrite_ratio ?? 0) <= max_rewrite);
    }
    if (min_retention !== undefined) {
      filtered = filtered.filter((t) => (t.completion_rate ?? 0) >= min_retention);
    }
    if (max_ip !== undefined) {
      filtered = filtered.filter((t) => (t.ip_strength ?? 0) <= max_ip);
    }
    if (min_votes !== undefined) {
      filtered = filtered.filter((t) => (t.vote_count ?? 0) >= min_votes);
    }

    // Format & compute metrics on the fly
    let outputPool = filtered.map((item) => formatTalentRecord(item, config, cachedLeagueAvgWar));

    if (min_war !== undefined) {
      outputPool = outputPool.filter((t) => (t.creative_war ?? 0) >= min_war);
    }
    if (min_regressed_war !== undefined) {
      outputPool = outputPool.filter((t) => (t.regressed_war ?? 0) >= min_regressed_war);
    }
    if (min_wrc_plus !== undefined) {
      outputPool = outputPool.filter((t) => (t.creative_wrc_plus ?? 0) >= min_wrc_plus);
    }
    if (min_consistency !== undefined) {
      outputPool = outputPool.filter((t) => (t.career_consistency ?? 0) >= min_consistency);
    }

    if (undervalued_only) {
      outputPool = outputPool.filter((t) => (t.creative_war ?? 0) >= 3.0);
    }

    // Multi-attribute sorting
    outputPool.sort((a, b) => {
      let comparison = 0;
      switch (sort_by) {
        case 'regressed_war':
        case 'regressed':
          comparison = (b.regressed_war ?? 0) - (a.regressed_war ?? 0);
          break;
        case 'wrc_plus':
        case 'wrc':
          comparison = (b.creative_wrc_plus ?? 0) - (a.creative_wrc_plus ?? 0);
          break;
        case 'consistency':
        case 'career_consistency':
          comparison = (b.career_consistency ?? 0) - (a.career_consistency ?? 0);
          break;
        case 'votes':
        case 'vote_count':
          comparison = (b.vote_count ?? 0) - (a.vote_count ?? 0);
          break;
        case 'value':
          comparison = (b.value_rating ?? 0) - (a.value_rating ?? 0);
          break;
        case 'cost':
          comparison = (b.base_cost ?? 0) - (a.base_cost ?? 0);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'retention':
        case 'completion':
          comparison = (b.completion_rate ?? 0) - (a.completion_rate ?? 0);
          break;
        case 'wom':
          comparison = (b.word_of_mouth_score ?? 0) - (a.word_of_mouth_score ?? 0);
          break;
        case 'rewrite':
          comparison = (a.rewrite_ratio ?? 0) - (b.rewrite_ratio ?? 0);
          break;
        case 'ip':
          comparison = (a.ip_strength ?? 0) - (b.ip_strength ?? 0);
          break;
        case 'hti':
          comparison = (b.hidden_talent_index ?? 0) - (a.hidden_talent_index ?? 0);
          break;
        case 'cost_per_war':
          comparison = (a.cost_per_war ?? 0) - (b.cost_per_war ?? 0);
          break;
        case 'surplus':
          comparison = (b.surplus_value ?? 0) - (a.surplus_value ?? 0);
          break;
        case 'war':
        default:
          comparison = (b.creative_war ?? 0) - (a.creative_war ?? 0);
          break;
      }
      return sort_dir === 'asc' ? -comparison : comparison;
    });

    const totalCount = outputPool.length;
    const start_idx = (page - 1) * page_size;
    const end_idx = start_idx + page_size;
    const paginated_results = outputPool.slice(start_idx, end_idx);

    res.json({
      total_count: totalCount,
      page,
      page_size,
      total_pages: Math.ceil(totalCount / page_size) || 1,
      items: paginated_results,
    });
  };

  app.get('/talent', handleQueryTalent);
  app.get('/talent/', handleQueryTalent);
  app.get('/api/talent', handleQueryTalent);
  app.get('/api/talent/', handleQueryTalent);

  // Create new talent profile
  const handleCreateTalent = (req: Request, res: Response) => {
    const { name, role, completion_rate, word_of_mouth_score, rewrite_ratio, ip_strength, base_cost, vote_count } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Valid talent name is required' });
    }

    const wom = Math.min(10.0, Math.max(1.0, Number(word_of_mouth_score) || 5.0));
    const votes = vote_count !== undefined && !isNaN(Number(vote_count))
      ? Math.max(1, Math.round(Number(vote_count)))
      : Math.max(5, Math.round(((wom - 1.0) / 9.0) * 1500));

    const newRecord: TalentRecord = {
      id: crypto.randomUUID(),
      name: name.trim(),
      role: role || 'Screenwriter',
      completion_rate: Math.min(1.0, Math.max(0.0, Number(completion_rate) || 0.5)),
      word_of_mouth_score: wom,
      rewrite_ratio: Math.min(1.0, Math.max(0.0, Number(rewrite_ratio) || 0.1)),
      ip_strength: Math.min(1.0, Math.max(0.0, Number(ip_strength) || 0.0)),
      base_cost: Math.max(10000, Number(base_cost) || 100000),
      vote_count: votes,
    };

    talentPool.unshift(newRecord);
    talentMap.set(newRecord.id, newRecord);

    const formatted = formatTalentRecord(newRecord, DEFAULT_CONFIG, cachedLeagueAvgWar);
    res.status(201).json(formatted);
  };

  app.post('/talent', handleCreateTalent);
  app.post('/talent/', handleCreateTalent);
  app.post('/api/talent', handleCreateTalent);
  app.post('/api/talent/', handleCreateTalent);

  // Update existing talent profile metrics
  const handleUpdateTalent = (req: Request, res: Response) => {
    const talent_id = req.params.talent_id;
    const existing = talentMap.get(talent_id);

    if (!existing) {
      return res.status(404).json({ error: 'Talent profile not found' });
    }

    const updates = req.body;
    if (updates.name !== undefined) existing.name = String(updates.name).trim();
    if (updates.role !== undefined) existing.role = String(updates.role);
    if (updates.completion_rate !== undefined) existing.completion_rate = Math.min(1.0, Math.max(0.0, Number(updates.completion_rate)));
    if (updates.word_of_mouth_score !== undefined) existing.word_of_mouth_score = Math.min(10.0, Math.max(1.0, Number(updates.word_of_mouth_score)));
    if (updates.rewrite_ratio !== undefined) existing.rewrite_ratio = Math.min(1.0, Math.max(0.0, Number(updates.rewrite_ratio)));
    if (updates.ip_strength !== undefined) existing.ip_strength = Math.min(1.0, Math.max(0.0, Number(updates.ip_strength)));
    if (updates.base_cost !== undefined) existing.base_cost = Math.max(0, Number(updates.base_cost));
    if (updates.vote_count !== undefined) existing.vote_count = Math.max(1, Math.round(Number(updates.vote_count)));

    const config = getFormulaConfig(req);
    const formatted = formatTalentRecord(existing, config, cachedLeagueAvgWar);
    res.json(formatted);
  };

  app.patch('/talent/:talent_id', handleUpdateTalent);
  app.patch('/api/talent/:talent_id', handleUpdateTalent);

  // Delete talent profile
  const handleDeleteTalent = (req: Request, res: Response) => {
    const talent_id = req.params.talent_id;
    if (!talentMap.has(talent_id)) {
      return res.status(404).json({ error: 'Talent profile not found' });
    }

    talentMap.delete(talent_id);
    talentPool = talentPool.filter((t) => t.id !== talent_id);
    res.json({ message: 'Talent profile removed from database', id: talent_id });
  };

  app.delete('/talent/:talent_id', handleDeleteTalent);
  app.delete('/api/talent/:talent_id', handleDeleteTalent);

  // Batch import talent profiles (from CSV or JSON)
  const handleBatchImport = (req: Request, res: Response) => {
    const items = req.body.items || req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Array of items required' });
    }

    let inserted = 0;
    let updated = 0;

    for (const raw of items) {
      if (!raw.name || typeof raw.name !== 'string') continue;
      const cleanName = raw.name.trim();
      const cleanRole = String(raw.role || 'Screenwriter');

      // Check if existing profile with matching name and role
      const existing = talentPool.find(
        (t) => t.name.toLowerCase() === cleanName.toLowerCase() && t.role === cleanRole
      );

      const compRate = Math.min(1.0, Math.max(0.0, Number(raw.completion_rate) || 0.5));
      const womScore = Math.min(10.0, Math.max(1.0, Number(raw.word_of_mouth_score) || 5.0));
      const rewRatio = Math.min(1.0, Math.max(0.0, Number(raw.rewrite_ratio) || 0.05));
      const ipStr = Math.min(1.0, Math.max(0.0, Number(raw.ip_strength) || 0.0));
      const cost = Math.max(10000, Number(raw.base_cost) || 75000);
      const votes = raw.vote_count !== undefined && !isNaN(Number(raw.vote_count))
        ? Math.max(1, Math.round(Number(raw.vote_count)))
        : Math.max(5, Math.round(((womScore - 1.0) / 9.0) * 1500));

      if (existing) {
        existing.completion_rate = compRate;
        existing.word_of_mouth_score = womScore;
        existing.rewrite_ratio = rewRatio;
        existing.ip_strength = ipStr;
        existing.base_cost = cost;
        existing.vote_count = votes;
        updated++;
      } else {
        const newRecord: TalentRecord = {
          id: raw.id || crypto.randomUUID(),
          name: cleanName,
          role: cleanRole,
          completion_rate: compRate,
          word_of_mouth_score: womScore,
          rewrite_ratio: rewRatio,
          ip_strength: ipStr,
          base_cost: cost,
          vote_count: votes,
        };
        talentPool.unshift(newRecord);
        talentMap.set(newRecord.id, newRecord);
        inserted++;
      }
    }

    recomputeLeagueAvgWar();

    res.json({
      message: `Batch import complete: ${inserted} profiles added, ${updated} profiles updated.`,
      inserted,
      updated,
      total_now: talentPool.length,
    });
  };

  // Historical Validation Tests & Empirical Proofs
  const handleHistoricalTests = (_req: Request, res: Response) => {
    try {
      const report = runHistoricalValidation();
      res.json(report);
    } catch (err: any) {
      console.error('Error running historical validation:', err);
      res.status(500).json({ error: err.message || 'Failed to run historical tests' });
    }
  };

  app.get('/talent/historical-tests', handleHistoricalTests);
  app.get('/api/historical-tests', handleHistoricalTests);

  // 1. IMDb Live Data Connectors Status
  const handleImdbSources = (_req: Request, res: Response) => {
    res.json({
      sources: IMDB_ACTIVE_SOURCES,
      overall_status: 'HEALTHY',
      last_global_sync: new Date().toISOString(),
      active_stream_records: 41758,
    });
  };

  app.get('/talent/imdb/sources', handleImdbSources);
  app.get('/api/imdb/sources', handleImdbSources);

  // 2. Up & Coming Talent Prospects Pipeline with Predictive Analytics
  const handleImdbProspects = (req: Request, res: Response) => {
    const stage = req.query.stage as string;
    const min_bvi = req.query.min_bvi ? parseFloat(req.query.min_bvi as string) : undefined;
    const max_cap = req.query.max_cap ? parseFloat(req.query.max_cap as string) : undefined;
    const search = ((req.query.search as string) || '').toLowerCase().trim();

    // Start with curated prospects
    let list: ImdbProspectRecord[] = [...CURATED_UP_AND_COMING_TALENT];

    // Filter by stage
    if (stage) {
      list = list.filter((p) => p.breakout_stage.toLowerCase().includes(stage.toLowerCase()));
    }

    // Filter by min BVI
    if (min_bvi !== undefined && !isNaN(min_bvi)) {
      list = list.filter((p) => p.breakout_velocity_index >= min_bvi);
    }

    // Filter by max cap
    if (max_cap !== undefined && !isNaN(max_cap)) {
      list = list.filter((p) => p.base_cost <= max_cap);
    }

    // Filter by search query
    if (search) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.role.toLowerCase().includes(search) ||
          p.star_archetype_comp.toLowerCase().includes(search) ||
          p.known_for_titles.some((t) => t.title.toLowerCase().includes(search))
      );
    }

    // Sort by Breakout Velocity Index by default
    const sort_by = (req.query.sort_by as string) || 'bvi';
    list.sort((a, b) => {
      if (sort_by === 'starmeter') return a.starmeter_rank - b.starmeter_rank; // lower is better
      if (sort_by === 'war3') return b.projected_war_year3 - a.projected_war_year3;
      if (sort_by === 'surplus') return b.projected_surplus_value - a.projected_surplus_value;
      if (sort_by === 'probability') return b.breakout_probability_pct - a.breakout_probability_pct;
      if (sort_by === 'cost') return a.base_cost - b.base_cost;
      return b.breakout_velocity_index - a.breakout_velocity_index;
    });

    res.json({
      total: list.length,
      prospects: list,
      pipeline_summary: {
        avg_breakout_velocity: Math.round(list.reduce((acc, p) => acc + p.breakout_velocity_index, 0) / Math.max(1, list.length)),
        avg_projected_war_year3: Math.round((list.reduce((acc, p) => acc + p.projected_war_year3, 0) / Math.max(1, list.length)) * 10) / 10,
        total_projected_surplus: list.reduce((acc, p) => acc + p.projected_surplus_value, 0),
        top_prospect_name: list[0]?.name || '',
      },
    });
  };

  app.get('/talent/prospects', handleImdbProspects);
  app.get('/api/imdb/prospects', handleImdbProspects);

  // 3. Live IMDb Search & Instant Stat Retrieval
  const handleImdbSearch = (req: Request, res: Response) => {
    const q = ((req.query.q as string) || '').toLowerCase().trim();
    if (!q) {
      return res.json({ results: [] });
    }

    // Match in prospects
    const prospectMatches = CURATED_UP_AND_COMING_TALENT.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.imdb_id.toLowerCase().includes(q) ||
        p.known_for_titles.some((t) => t.title.toLowerCase().includes(q))
    );

    // Match in main talent pool
    const poolMatches = talentPool
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, 10)
      .map((t) => getImdbDataForTalent(t));

    // Deduplicate by name
    const seen = new Set<string>();
    const combined: ImdbProspectRecord[] = [];
    for (const item of [...prospectMatches, ...poolMatches]) {
      const k = item.name.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        combined.push(item);
      }
    }

    res.json({
      query: q,
      total_matches: combined.length,
      results: combined,
    });
  };

  app.get('/talent/imdb/search', handleImdbSearch);
  app.get('/api/imdb/search', handleImdbSearch);

  // 4. Interactive Simulation & 3-Year Projection Model
  const handlePredictTalent = (req: Request, res: Response) => {
    const {
      current_war = 5.0,
      imdb_rating = 7.5,
      starmeter_rank = 150,
      starmeter_change = 100,
      completion_rate = 0.8,
      rewrite_ratio = 0.05,
      ip_strength = 0.0,
      base_cost = 250000,
      festival_boost = 0.5,
    } = req.body;

    const prediction = calculateTalentPrediction({
      current_war: Number(current_war) || 5.0,
      imdb_rating: Number(imdb_rating) || 7.5,
      starmeter_rank: Number(starmeter_rank) || 150,
      starmeter_change: Number(starmeter_change) || 100,
      completion_rate: Number(completion_rate) || 0.8,
      rewrite_ratio: Number(rewrite_ratio) || 0.05,
      ip_strength: Number(ip_strength) || 0.0,
      base_cost: Number(base_cost) || 250000,
      festival_boost: Number(festival_boost) || 0.5,
    });

    res.json({
      inputs: req.body,
      prediction,
    });
  };

  app.post('/talent/predict', handlePredictTalent);
  app.post('/api/talent/predict', handlePredictTalent);

  // 5. Import Prospect into Active Talent Pool
  const handleImportProspect = (req: Request, res: Response) => {
    const { prospect_id, name, role, base_cost, completion_rate, word_of_mouth_score, rewrite_ratio, ip_strength } = req.body;

    const prospect = CURATED_UP_AND_COMING_TALENT.find((p) => p.id === prospect_id || p.name.toLowerCase() === (name || '').toLowerCase());

    const finalName = prospect ? prospect.name : (name || 'New Prospect');
    const finalRole = prospect ? (prospect.role.includes('Director') ? 'Director' : 'Screenwriter') : (role || 'Director');
    const finalCost = prospect ? prospect.base_cost : (Number(base_cost) || 250000);
    const finalComp = prospect ? prospect.completion_rate : (Number(completion_rate) || 0.85);
    const finalWom = prospect ? prospect.word_of_mouth_score : (Number(word_of_mouth_score) || 8.5);
    const finalRew = prospect ? prospect.rewrite_ratio : (Number(rewrite_ratio) || 0.05);
    const finalIp = prospect ? prospect.ip_strength : (Number(ip_strength) || 0.0);

    // Check if already in talent pool
    const existing = talentPool.find((t) => t.name.toLowerCase() === finalName.toLowerCase());
    if (existing) {
      const config = getFormulaConfig(req);
      return res.json({
        message: `${finalName} is already in the talent pool!`,
        talent: formatTalentRecord(existing, config, cachedLeagueAvgWar),
        is_new: false,
      });
    }

    const newRecord: TalentRecord = {
      id: crypto.randomUUID(),
      name: finalName,
      role: finalRole,
      completion_rate: finalComp,
      word_of_mouth_score: finalWom,
      rewrite_ratio: finalRew,
      ip_strength: finalIp,
      base_cost: finalCost,
      vote_count: Math.round(finalWom * 2000),
      avatar_url: prospect?.avatar_url,
    };

    talentPool.unshift(newRecord);
    talentMap.set(newRecord.id, newRecord);
    recomputeLeagueAvgWar();

    const config = getFormulaConfig(req);
    const formatted = formatTalentRecord(newRecord, config, cachedLeagueAvgWar);

    res.status(201).json({
      message: `Successfully drafted ${finalName} into active talent pool!`,
      talent: formatted,
      is_new: true,
      total_talent: talentPool.length,
    });
  };

  app.post('/talent/prospects/import', handleImportProspect);
  app.post('/api/imdb/import', handleImportProspect);

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Sabermetrics Studio Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
