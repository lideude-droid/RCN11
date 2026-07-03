const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

/* ---------------- leitura pública ---------------- */

// GET /api/clubs -> para a classificação e a grelha de clubes no dashboard
router.get('/clubs', async (req, res) => {
  const { data, error } = await supabase.from('clubs').select('*');
  if (error) return res.status(500).json({ error: 'Não foi possível carregar os clubes.' });
  return res.json(data);
});

// GET /api/players -> para os melhores marcadores no dashboard
router.get('/players', async (req, res) => {
  const { data, error } = await supabase
    .from('players')
    .select('*, clubs(name)')
    .order('goals', { ascending: false });
  if (error) return res.status(500).json({ error: 'Não foi possível carregar os jogadores.' });
  return res.json(data);
});

// GET /api/matches -> lista de jogos (agendados e realizados), com o nome dos clubes
router.get('/matches', async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*, home_club:home_club_id(name), away_club:away_club_id(name)')
    .order('played_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Não foi possível carregar os jogos.' });
  return res.json(data);
});

// GET /api/matches/:id -> detalhe de um jogo (clubes + acontecimentos: quem marcou, cartões, etc.)
router.get('/matches/:id', async (req, res) => {
  const { id } = req.params;

  const { data: match, error } = await supabase
    .from('matches')
    .select('*, home_club:home_club_id(name), away_club:away_club_id(name)')
    .eq('id', id)
    .single();

  if (error || !match) return res.status(404).json({ error: 'Jogo não encontrado.' });

  const { data: events } = await supabase
    .from('match_events')
    .select('*, club:club_id(name), player:player_id(name)')
    .eq('match_id', id)
    .order('minute', { ascending: true, nullsFirst: true });

  return res.json({ ...match, events: events || [] });
});

/* ---------------- comentários ---------------- */

// GET /api/posts/:id/comments
router.get('/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: 'Não foi possível carregar os comentários.' });
  return res.json(data);
});

// POST /api/posts/:id/comments
// body: { author_id, author_username, author_avatar, content }
router.post('/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { author_id, author_username, author_avatar, content } = req.body || {};

  if (!author_id || !content || !content.trim()) {
    return res.status(400).json({ error: 'Faltam campos obrigatórios (author_id, content).' });
  }

  const { data, error } = await supabase
    .from('comments')
    .insert([{
      post_id: id,
      author_id,
      author_username: author_username || 'Jogador RCN',
      author_avatar: author_avatar || null,
      content: content.trim()
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Não foi possível publicar o comentário.' });
  return res.status(201).json(data);
});

// DELETE /api/comments/:id -> só o autor pode apagar (validado pelo body)
router.delete('/comments/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body || {};

  const { data: comment, error: fetchError } = await supabase
    .from('comments')
    .select('author_id')
    .eq('id', id)
    .single();

  if (fetchError || !comment) return res.status(404).json({ error: 'Comentário não encontrado.' });
  if (comment.author_id !== user_id) return res.status(403).json({ error: 'Só o autor pode apagar este comentário.' });

  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Não foi possível apagar o comentário.' });
  return res.status(204).send();
});

module.exports = router;
