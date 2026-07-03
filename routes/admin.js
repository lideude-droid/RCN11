const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

// IMPORTANTE: tens de definir estas 3 variáveis no Render (Environment).
// Não há valores por defeito no código de propósito — assim ninguém esquece de as configurar.
const ADMIN_KEY = process.env.ADMIN_KEY;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_KEY || !ADMIN_USER || !ADMIN_PASSWORD) {
  console.warn(
    '[admin] ADMIN_KEY, ADMIN_USER ou ADMIN_PASSWORD em falta nas variáveis de ambiente. ' +
    'A administração não vai funcionar até configurares isto no Render.'
  );
}

// POST /api/admin/login -> valida utilizador/password no servidor (nunca no browser)
// body: { username, password }
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    return res.json({ key: ADMIN_KEY });
  }
  return res.status(401).json({ error: 'Utilizador ou palavra-passe incorretos.' });
});

// protege todas as rotas a seguir: exige o cabeçalho x-admin-key
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Acesso de administrador inválido.' });
  }
  next();
}

router.use(requireAdmin);

/* ---------------- CLUBES ---------------- */

// GET /api/admin/clubs
router.get('/clubs', async (req, res) => {
  const { data, error } = await supabase.from('clubs').select('*').order('name');
  if (error) return res.status(500).json({ error: 'Não foi possível carregar os clubes.' });
  return res.json(data);
});

// POST /api/admin/clubs -> cria um clube novo
router.post('/clubs', async (req, res) => {
  const { name, city, manager, assistant_manager } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Falta o nome do clube.' });

  const { data, error } = await supabase
    .from('clubs')
    .insert([{ name, city: city || '', manager: manager || '', assistant_manager: assistant_manager || '' }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Não foi possível criar o clube.' });
  return res.status(201).json(data);
});

// PATCH /api/admin/clubs/:id -> atualiza qualquer campo (nome, estatísticas, etc.)
router.patch('/clubs/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['name', 'city', 'manager', 'assistant_manager', 'discord_role_id', 'budget', 'played', 'won', 'drawn', 'lost', 'goals_for', 'goals_against'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }

  const { data, error } = await supabase.from('clubs').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: 'Não foi possível atualizar o clube.' });
  return res.json(data);
});

// DELETE /api/admin/clubs/:id
router.delete('/clubs/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('clubs').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Não foi possível remover o clube.' });
  return res.status(204).send();
});

/* ---------------- JOGADORES ---------------- */

// GET /api/admin/players
router.get('/players', async (req, res) => {
  const { data, error } = await supabase
    .from('players')
    .select('*, clubs(name)')
    .order('goals', { ascending: false });
  if (error) return res.status(500).json({ error: 'Não foi possível carregar os jogadores.' });
  return res.json(data);
});

// POST /api/admin/players -> cria um jogador novo
router.post('/players', async (req, res) => {
  const { name, club_id } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Falta o nome do jogador.' });

  const { data, error } = await supabase
    .from('players')
    .insert([{ name, club_id: club_id || null }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Não foi possível criar o jogador.' });
  return res.status(201).json(data);
});

// PATCH /api/admin/players/:id -> atualiza golos, assistências, cartões, clube, nome
router.patch('/players/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['name', 'club_id', 'goals', 'assists', 'yellow_cards', 'red_cards'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }

  const { data, error } = await supabase.from('players').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: 'Não foi possível atualizar o jogador.' });
  return res.json(data);
});

// DELETE /api/admin/players/:id
router.delete('/players/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Não foi possível remover o jogador.' });
  return res.status(204).send();
});

/* ---------------- MERCADO DE TRANSFERÊNCIAS ---------------- */

// GET /api/admin/market -> estado atual
router.get('/market', async (req, res) => {
  const { data } = await supabase.from('transfer_settings').select('*').eq('id', 1).single();
  return res.json(data || { is_open: false });
});

// POST /api/admin/market -> abrir ou fechar
// body: { action: 'open' | 'close' }
router.post('/market', async (req, res) => {
  const { action } = req.body || {};
  if (!['open', 'close'].includes(action))
    return res.status(400).json({ error: 'action tem de ser "open" ou "close".' });

  const isOpen = action === 'open';
  const updates = {
    is_open: isOpen,
    ...(isOpen ? { opened_at: new Date().toISOString(), closed_at: null }
               : { closed_at: new Date().toISOString() })
  };

  const { data, error } = await supabase
    .from('transfer_settings').update(updates).eq('id', 1).select().single();

  if (error) return res.status(500).json({ error: 'Não foi possível atualizar o mercado.' });
  return res.json(data);
});

/* ------------ orçamento dos clubes (admin pode ajustar) ------------ */
// PATCH /api/admin/clubs/:id/budget
// body: { budget }
router.patch('/clubs/:id/budget', async (req, res) => {
  const { id } = req.params;
  const { budget } = req.body || {};
  if (budget === undefined) return res.status(400).json({ error: 'Falta budget.' });

  const { data, error } = await supabase
    .from('clubs').update({ budget: Number(budget) }).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: 'Não foi possível atualizar o orçamento.' });
  return res.json(data);
});

/* ---------------- JOGOS ---------------- */

// recalcula played/won/drawn/lost/goals_for/goals_against de um clube
// a partir de todos os jogos com status "played" em que participou
async function recomputeClubStats(clubId) {
  if (!clubId) return;
  const { data: matches, error } = await supabase
    .from('matches')
    .select('home_club_id, away_club_id, home_score, away_score')
    .eq('status', 'played')
    .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`);

  if (error || !matches) return;

  let played = 0, won = 0, drawn = 0, lost = 0, goals_for = 0, goals_against = 0;
  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue;
    played++;
    const isHome = m.home_club_id === clubId;
    const gf = isHome ? m.home_score : m.away_score;
    const ga = isHome ? m.away_score : m.home_score;
    goals_for += gf;
    goals_against += ga;
    if (gf > ga) won++;
    else if (gf === ga) drawn++;
    else lost++;
  }

  await supabase.from('clubs').update({ played, won, drawn, lost, goals_for, goals_against }).eq('id', clubId);
}

// GET /api/admin/matches
router.get('/matches', async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('played_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Não foi possível carregar os jogos.' });
  return res.json(data);
});

// POST /api/admin/matches -> cria um jogo novo (ex: SLB vs SCP)
// body: { home_club_id, away_club_id, matchday, played_at, status, home_score, away_score }
router.post('/matches', async (req, res) => {
  const { home_club_id, away_club_id, matchday, played_at, status, home_score, away_score } = req.body || {};
  if (!home_club_id || !away_club_id) {
    return res.status(400).json({ error: 'Falta escolher os dois clubes.' });
  }
  if (home_club_id === away_club_id) {
    return res.status(400).json({ error: 'Os dois clubes têm de ser diferentes.' });
  }

  const { data, error } = await supabase
    .from('matches')
    .insert([{
      home_club_id,
      away_club_id,
      matchday: matchday || null,
      played_at: played_at || new Date().toISOString(),
      status: status === 'played' ? 'played' : 'scheduled',
      home_score: home_score === undefined ? null : home_score,
      away_score: away_score === undefined ? null : away_score
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Não foi possível criar o jogo.' });

  if (data.status === 'played') {
    await recomputeClubStats(home_club_id);
    await recomputeClubStats(away_club_id);
  }
  return res.status(201).json(data);
});

// PATCH /api/admin/matches/:id -> atualiza resultado, estado, jornada ou data
router.patch('/matches/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['home_club_id', 'away_club_id', 'home_score', 'away_score', 'status', 'matchday', 'played_at'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }

  const { data, error } = await supabase.from('matches').update(updates).eq('id', id).select().single();
  if (error || !data) return res.status(500).json({ error: 'Não foi possível atualizar o jogo.' });

  await recomputeClubStats(data.home_club_id);
  await recomputeClubStats(data.away_club_id);
  return res.json(data);
});

// DELETE /api/admin/matches/:id
router.delete('/matches/:id', async (req, res) => {
  const { id } = req.params;

  const { data: match } = await supabase.from('matches').select('home_club_id, away_club_id').eq('id', id).single();

  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Não foi possível remover o jogo.' });

  if (match) {
    await recomputeClubStats(match.home_club_id);
    await recomputeClubStats(match.away_club_id);
  }
  return res.status(204).send();
});

// GET /api/admin/matches/:id/events
router.get('/matches/:id/events', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('match_events')
    .select('*')
    .eq('match_id', id)
    .order('minute', { ascending: true, nullsFirst: true });
  if (error) return res.status(500).json({ error: 'Não foi possível carregar os acontecimentos.' });

  const goalsAndOthers = (data || []).filter((e) => e.event_type !== 'assist');
  const assists = (data || []).filter((e) => e.event_type === 'assist');
  const ordered = [];
  goalsAndOthers.forEach((ev) => {
    ordered.push(ev);
    assists.filter((a) => a.parent_event_id === ev.id).forEach((a) => ordered.push(a));
  });
  assists.filter((a) => !goalsAndOthers.some((ev) => ev.id === a.parent_event_id)).forEach((a) => ordered.push(a));

  return res.json(ordered);
});

// POST /api/admin/matches/:id/events -> adiciona um acontecimento (golo, cartão, etc.)
// body: { club_id, player_id, player_name, event_type, minute, note, parent_event_id }
// nota: uma assistência (event_type = "assist") tem de estar ligada a um golo (parent_event_id)
router.post('/matches/:id/events', async (req, res) => {
  const { id } = req.params;
  const { club_id, player_id, player_name, event_type, minute, note, parent_event_id } = req.body || {};

  if (!club_id) {
    return res.status(400).json({ error: 'Falta escolher o clube.' });
  }
  const allowedTypes = ['goal', 'own_goal', 'assist', 'yellow', 'red'];
  const safeType = allowedTypes.includes(event_type) ? event_type : 'goal';

  let safeParentId = null;
  if (safeType === 'assist') {
    if (!parent_event_id) {
      return res.status(400).json({ error: 'Uma assistência tem de estar ligada a um golo.' });
    }
    const { data: goalEvent } = await supabase
      .from('match_events')
      .select('id, event_type, match_id')
      .eq('id', parent_event_id)
      .single();
    if (!goalEvent || goalEvent.match_id !== id || goalEvent.event_type !== 'goal') {
      return res.status(400).json({ error: 'O golo escolhido para a assistência não é válido.' });
    }
    safeParentId = parent_event_id;
  }

  const { data, error } = await supabase
    .from('match_events')
    .insert([{
      match_id: id,
      club_id,
      player_id: player_id || null,
      player_name: player_name || null,
      event_type: safeType,
      minute: minute === undefined || minute === '' ? null : Number(minute),
      note: note || null,
      parent_event_id: safeParentId
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Não foi possível adicionar o acontecimento.' });
  return res.status(201).json(data);
});

// DELETE /api/admin/match-events/:eventId
router.delete('/match-events/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { error } = await supabase.from('match_events').delete().eq('id', eventId);
  if (error) return res.status(500).json({ error: 'Não foi possível remover o acontecimento.' });
  return res.status(204).send();
});

module.exports = router;
