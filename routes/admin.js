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
router.post('/admin/login', (req, res) => {
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
router.get('/admin/clubs', async (req, res) => {
  const { data, error } = await supabase.from('clubs').select('*').order('name');
  if (error) return res.status(500).json({ error: 'Não foi possível carregar os clubes.' });
  return res.json(data);
});

// POST /api/admin/clubs -> cria um clube novo
router.post('/admin/clubs', async (req, res) => {
  const { name, city, manager } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Falta o nome do clube.' });

  const { data, error } = await supabase
    .from('clubs')
    .insert([{ name, city: city || '', manager: manager || '' }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Não foi possível criar o clube.' });
  return res.status(201).json(data);
});

// PATCH /api/admin/clubs/:id -> atualiza qualquer campo (nome, estatísticas, etc.)
router.patch('/admin/clubs/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['name', 'city', 'manager', 'played', 'won', 'drawn', 'lost', 'goals_for', 'goals_against'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }

  const { data, error } = await supabase.from('clubs').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: 'Não foi possível atualizar o clube.' });
  return res.json(data);
});

// DELETE /api/admin/clubs/:id
router.delete('/admin/clubs/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('clubs').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Não foi possível remover o clube.' });
  return res.status(204).send();
});

/* ---------------- JOGADORES ---------------- */

// GET /api/admin/players
router.get('/admin/players', async (req, res) => {
  const { data, error } = await supabase
    .from('players')
    .select('*, clubs(name)')
    .order('goals', { ascending: false });
  if (error) return res.status(500).json({ error: 'Não foi possível carregar os jogadores.' });
  return res.json(data);
});

// POST /api/admin/players -> cria um jogador novo
router.post('/admin/players', async (req, res) => {
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
router.patch('/admin/players/:id', async (req, res) => {
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
router.delete('/admin/players/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Não foi possível remover o jogador.' });
  return res.status(204).send();
});

module.exports = router;
