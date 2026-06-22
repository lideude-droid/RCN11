const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

const OWNER_ROLE_ID = '1395516741840273418';

// middleware: verifica que o utilizador é dono de clube (via cargos guardados na BD)
async function requireOwner(req, res, next) {
  const user_id = req.body?.user_id || req.query?.user_id;
  if (!user_id) return res.status(401).json({ error: 'Falta user_id.' });

  const { data: user } = await supabase
    .from('users').select('roles').eq('discord_id', user_id).single();

  if (!user || !user.roles.includes(OWNER_ROLE_ID))
    return res.status(403).json({ error: 'Precisas de ser dono de um clube.' });

  // descobre qual o clube deste dono (o cargo do clube é o discord_role_id do clube)
  const { data: clubs } = await supabase.from('clubs').select('id, name, discord_role_id, budget');
  const ownedClub = clubs?.find(c => c.discord_role_id && user.roles.includes(c.discord_role_id));
  if (!ownedClub)
    return res.status(403).json({ error: 'O teu cargo de clube ainda não foi configurado pelo admin.' });

  req.ownedClub = ownedClub;
  req.ownerRoles = user.roles;
  next();
}

/* -------- estado do mercado (público) -------- */
router.get('/market/status', async (req, res) => {
  const { data } = await supabase.from('transfer_settings').select('*').eq('id', 1).single();
  return res.json(data || { is_open: false });
});

/* -------- jogadores disponíveis no mercado (público quando aberto) -------- */
router.get('/market/players', async (req, res) => {
  const { data: settings } = await supabase.from('transfer_settings').select('is_open').eq('id', 1).single();
  if (!settings?.is_open)
    return res.status(403).json({ error: 'O mercado de transferências está fechado.' });

  const { data: players, error } = await supabase
    .from('players')
    .select('*, clubs(id, name)')
    .order('goals', { ascending: false });

  if (error) return res.status(500).json({ error: 'Não foi possível carregar os jogadores.' });
  return res.json(players);
});

/* -------- dados do clube do dono autenticado -------- */
// GET /api/club/mine?user_id=...
router.get('/club/mine', requireOwner, async (req, res) => {
  const club = req.ownedClub;

  // jogadores do clube
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('club_id', club.id)
    .order('goals', { ascending: false });

  // propostas recebidas (pendentes) para jogadores do clube
  const { data: proposals } = await supabase
    .from('proposals')
    .select('*, players(name), from_club:from_club_id(name)')
    .eq('to_club_id', club.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return res.json({
    club: { ...club },
    players: players || [],
    proposals: proposals || []
  });
});

/* -------- jogadores de outros clubes (para contratar) -------- */
// GET /api/club/others?user_id=...
router.get('/club/others', requireOwner, async (req, res) => {
  const { data: settings } = await supabase.from('transfer_settings').select('is_open').eq('id', 1).single();
  if (!settings?.is_open)
    return res.status(403).json({ error: 'O mercado de transferências está fechado.' });

  const { data: players, error } = await supabase
    .from('players')
    .select('*, clubs(id, name)')
    .neq('club_id', req.ownedClub.id)
    .not('club_id', 'is', null)
    .order('goals', { ascending: false });

  if (error) return res.status(500).json({ error: 'Não foi possível carregar os jogadores.' });
  return res.json(players || []);
});

/* -------- enviar proposta -------- */
// POST /api/proposals
// body: { user_id, player_id, amount, message }
router.post('/proposals', requireOwner, async (req, res) => {
  const { player_id, amount, message } = req.body || {};
  if (!player_id || !amount) return res.status(400).json({ error: 'Faltam player_id ou amount.' });

  const { data: settings } = await supabase.from('transfer_settings').select('is_open').eq('id', 1).single();
  if (!settings?.is_open) return res.status(403).json({ error: 'O mercado está fechado.' });

  // verifica orçamento disponível
  if (amount > req.ownedClub.budget)
    return res.status(400).json({ error: `Orçamento insuficiente. Tens ${req.ownedClub.budget.toLocaleString('pt')} €.` });

  // descobre o clube atual do jogador
  const { data: player } = await supabase.from('players').select('club_id, name').eq('id', player_id).single();
  if (!player) return res.status(404).json({ error: 'Jogador não encontrado.' });
  if (player.club_id === req.ownedClub.id) return res.status(400).json({ error: 'Este jogador já é do teu clube.' });

  // verifica se já existe uma proposta pendente deste clube para este jogador
  const { data: existing } = await supabase
    .from('proposals')
    .select('id')
    .eq('player_id', player_id)
    .eq('from_club_id', req.ownedClub.id)
    .eq('status', 'pending')
    .single();

  if (existing) return res.status(400).json({ error: 'Já tens uma proposta pendente para este jogador.' });

  const { data, error } = await supabase.from('proposals').insert([{
    player_id,
    from_club_id: req.ownedClub.id,
    to_club_id: player.club_id,
    amount: Number(amount),
    message: message || '',
    status: 'pending'
  }]).select().single();

  if (error) return res.status(500).json({ error: 'Não foi possível enviar a proposta.' });
  return res.status(201).json(data);
});

/* -------- aceitar ou rejeitar proposta -------- */
// PATCH /api/proposals/:id
// body: { user_id, action: 'accept' | 'reject' }
router.patch('/proposals/:id', requireOwner, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body || {};
  if (!['accept', 'reject'].includes(action))
    return res.status(400).json({ error: 'action tem de ser "accept" ou "reject".' });

  const { data: proposal } = await supabase
    .from('proposals').select('*').eq('id', id).single();

  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada.' });
  if (proposal.to_club_id !== req.ownedClub.id)
    return res.status(403).json({ error: 'Esta proposta não é para o teu clube.' });
  if (proposal.status !== 'pending')
    return res.status(400).json({ error: 'Esta proposta já foi processada.' });

  if (action === 'reject') {
    await supabase.from('proposals').update({ status: 'rejected' }).eq('id', id);
    return res.json({ ok: true, status: 'rejected' });
  }

  // ACEITAR: verifica orçamento do clube comprador
  const { data: buyerClub } = await supabase.from('clubs').select('budget').eq('id', proposal.from_club_id).single();
  if (!buyerClub || buyerClub.budget < proposal.amount)
    return res.status(400).json({ error: 'O clube comprador já não tem orçamento suficiente.' });

  // transferência: move o jogador, atualiza os dois orçamentos, cancela outras propostas pendentes
  const [, , ,] = await Promise.all([
    supabase.from('players').update({ club_id: proposal.from_club_id }).eq('id', proposal.player_id),
    supabase.from('clubs').update({ budget: buyerClub.budget - proposal.amount }).eq('id', proposal.from_club_id),
    supabase.from('clubs').update({ budget: req.ownedClub.budget + proposal.amount }).eq('id', proposal.to_club_id),
    supabase.from('proposals')
      .update({ status: 'cancelled' })
      .eq('player_id', proposal.player_id)
      .eq('status', 'pending')
      .neq('id', id)
  ]);

  await supabase.from('proposals').update({ status: 'accepted' }).eq('id', id);
  return res.json({ ok: true, status: 'accepted' });
});

module.exports = router;
