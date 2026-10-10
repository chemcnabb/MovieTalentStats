import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

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
  creative_war?: number;
  value_rating?: number;
  // Sabermetric computed sub-metrics
  x_engagement?: number;
  context_lift?: number;
  efficiency_score?: number;
  replacement_delta?: number;
  cost_per_war?: number;
  surplus_value?: number;
  hidden_talent_index?: number;
}

interface FormulaConfig {
  engagementMultiplier: number;
  ipDiscountFactor: number;
  efficiencyPenalty: number;
}

const DEFAULT_CONFIG: FormulaConfig = {
  engagementMultiplier: 10.0,
  ipDiscountFactor: 0.5,
  efficiencyPenalty: 3.0,
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

function formatTalentRecord(item: TalentRecord, config: FormulaConfig = DEFAULT_CONFIG): TalentRecord {
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
    creative_war: war,
    value_rating: value_rating,
    x_engagement: xEngagement,
    context_lift: contextLift,
    efficiency_score: efficiencyScore,
    replacement_delta: replacement_delta,
    cost_per_war: cost_per_war,
    surplus_value: surplus_value,
    hidden_talent_index: hti,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const HOST = '0.0.0.0';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Load in-memory talent database
  const dataPath = path.resolve(__dirname, 'data', 'talent_data.json');
  let talentPool: TalentRecord[] = [];
  const talentMap = new Map<string, TalentRecord>();

  if (fs.existsSync(dataPath)) {
    try {
      talentPool = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      for (const item of talentPool) {
        talentMap.set(item.id, item);
      }
      console.log(`Loaded ${talentPool.length} talent profiles into memory.`);
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
    };
  };

  // Summary statistics endpoint for front-office analytics overview
  const handleSummaryStats = (req: Request, res: Response) => {
    const config = getFormulaConfig(req);
    const total = talentPool.length;
    let totalWar = 0;
    let totalCost = 0;
    let screenwriters = 0;
    let directors = 0;
    let novelists = 0;
    let undervaluedCount = 0;

    for (const t of talentPool) {
      const { war } = calculateCreativeWar(t, config);
      const cost = t.base_cost || 75000;
      const costFactor = Math.max(1.0, cost / 100000.0);
      const valueRating = war / costFactor;

      totalWar += war;
      totalCost += cost;

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
      avg_cost: total > 0 ? Math.round(totalCost / total) : 0,
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
    const formattedPool = talentPool.map((t) => formatTalentRecord(t, config));

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
    res.json(formatTalentRecord(item, config));
  };

  app.get('/talent/:talent_id', handleGetTalentById);
  app.get('/api/talent/:talent_id', handleGetTalentById);

  // Statistical Comps endpoint (Bill James similarity)
  const handleGetTalentComps = (req: Request, res: Response) => {
    const id = req.params.talent_id;
    const target = talentMap.get(id);
    if (!target) {
      return res.status(404).json({ error: 'Talent not found' });
    }
    const config = getFormulaConfig(req);
    const targetFormatted = formatTalentRecord(target, config);

    // Calculate distance against other creators in talentPool
    const candidates = talentPool
      .filter((t) => t.id !== id)
      .slice(0, 1500)
      .map((t) => {
        const formatted = formatTalentRecord(t, config);
        const dist = Math.sqrt(
          Math.pow((t.completion_rate - target.completion_rate) * 10, 2) +
          Math.pow(t.word_of_mouth_score - target.word_of_mouth_score, 2) +
          Math.pow((t.rewrite_ratio - target.rewrite_ratio) * 10, 2) +
          Math.pow((t.ip_strength - target.ip_strength) * 5, 2) +
          Math.pow(((formatted.creative_war ?? 0) - (targetFormatted.creative_war ?? 0)) * 0.4, 2)
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

    // Format & compute metrics on the fly
    let outputPool = filtered.map((item) => formatTalentRecord(item, config));

    if (min_war !== undefined) {
      outputPool = outputPool.filter((t) => (t.creative_war ?? 0) >= min_war);
    }

    if (undervalued_only) {
      outputPool = outputPool.filter((t) => (t.creative_war ?? 0) >= 3.0);
    }

    // Multi-attribute sorting
    outputPool.sort((a, b) => {
      let comparison = 0;
      switch (sort_by) {
        case 'value':
          comparison = (b.value_rating ?? 0) - (a.value_rating ?? 0);
          break;
        case 'cost':
          comparison = (b.base_cost ?? 0) - (a.base_cost ?? 0);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
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
    const { name, role, completion_rate, word_of_mouth_score, rewrite_ratio, ip_strength, base_cost } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Valid talent name is required' });
    }

    const newRecord: TalentRecord = {
      id: crypto.randomUUID(),
      name: name.trim(),
      role: role || 'Screenwriter',
      completion_rate: Math.min(1.0, Math.max(0.0, Number(completion_rate) || 0.5)),
      word_of_mouth_score: Math.min(10.0, Math.max(1.0, Number(word_of_mouth_score) || 5.0)),
      rewrite_ratio: Math.min(1.0, Math.max(0.0, Number(rewrite_ratio) || 0.1)),
      ip_strength: Math.min(1.0, Math.max(0.0, Number(ip_strength) || 0.0)),
      base_cost: Math.max(10000, Number(base_cost) || 100000),
    };

    talentPool.unshift(newRecord);
    talentMap.set(newRecord.id, newRecord);

    const formatted = formatTalentRecord(newRecord);
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

    const formatted = formatTalentRecord(existing);
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

      if (existing) {
        existing.completion_rate = compRate;
        existing.word_of_mouth_score = womScore;
        existing.rewrite_ratio = rewRatio;
        existing.ip_strength = ipStr;
        existing.base_cost = cost;
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
        };
        talentPool.unshift(newRecord);
        talentMap.set(newRecord.id, newRecord);
        inserted++;
      }
    }

    res.json({
      message: `Batch import complete: ${inserted} profiles added, ${updated} profiles updated.`,
      inserted,
      updated,
      total_now: talentPool.length,
    });
  };

  app.post('/talent/batch', handleBatchImport);
  app.post('/api/talent/batch', handleBatchImport);

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
