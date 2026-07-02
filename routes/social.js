const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

/* ---------------- perfis / conta ---------------- */

// GET /api/users/:id -> dados públicos de um utilizador + contadores
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('discord_id, username, avatar, roles, last_seen')
    .eq('discord_id', id)
    .single();

  if (userError || !user) {
    return res.status(404).json({ error: 'Utilizador não encontrado.' });
  }

  const [{ count: postsCount }, { count: followersCount }, { count: followingCount }] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', id),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', id),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', id)
  ]);

  return res.json({
    ...user,
    postsCount: postsCount || 0,
    followersCount: followersCount || 0,
    followingCount: followingCount || 0
  });
});

/* ---------------- seguir / deixar de seguir ---------------- */

// GET /api/follow-status?follower_id=&following_id=
router.get('/follow-status', async (req, res) => {
  const { follower_id, following_id } = req.query || {};
  if (!follower_id || !following_id) {
    return res.status(400).json({ error: 'Faltam "follower_id" e "following_id".' });
  }

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', follower_id)
    .eq('following_id', following_id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Não foi possível verificar o estado.' });
  return res.json({ following: !!data });
});

// POST /api/follow -> body: { follower_id, following_id }
router.post('/follow', async (req, res) => {
  const { follower_id, following_id } = req.body || {};
  if (!follower_id || !following_id) {
    return res.status(400).json({ error: 'Faltam "follower_id" e "following_id".' });
  }
  if (follower_id === following_id) {
    return res.status(400).json({ error: 'Não podes seguir-te a ti próprio.' });
  }

  const { error } = await supabase
    .from('follows')
    .upsert([{ follower_id, following_id }], { onConflict: 'follower_id,following_id' });

  if (error) {
    console.error('[social] erro a seguir:', error);
    return res.status(500).json({ error: 'Não foi possível seguir este utilizador.' });
  }
  return res.status(201).json({ following: true });
});

// POST /api/unfollow -> body: { follower_id, following_id }
router.post('/unfollow', async (req, res) => {
  const { follower_id, following_id } = req.body || {};
  if (!follower_id || !following_id) {
    return res.status(400).json({ error: 'Faltam "follower_id" e "following_id".' });
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', follower_id)
    .eq('following_id', following_id);

  if (error) {
    console.error('[social] erro a deixar de seguir:', error);
    return res.status(500).json({ error: 'Não foi possível deixar de seguir este utilizador.' });
  }
  return res.json({ following: false });
});

// GET /api/followers/:id -> lista de quem segue este utilizador
router.get('/followers/:id', async (req, res) => {
  const { id } = req.params;

  const { data: rows, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', id);

  if (error) return res.status(500).json({ error: 'Não foi possível carregar os seguidores.' });

  const ids = (rows || []).map((r) => r.follower_id);
  if (ids.length === 0) return res.json([]);

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('discord_id, username, avatar')
    .in('discord_id', ids);

  if (usersError) return res.status(500).json({ error: 'Não foi possível carregar os seguidores.' });
  return res.json(users || []);
});

// GET /api/following/:id -> lista de quem este utilizador segue
router.get('/following/:id', async (req, res) => {
  const { id } = req.params;

  const { data: rows, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', id);

  if (error) return res.status(500).json({ error: 'Não foi possível carregar quem segue.' });

  const ids = (rows || []).map((r) => r.following_id);
  if (ids.length === 0) return res.json([]);

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('discord_id, username, avatar')
    .in('discord_id', ids);

  if (usersError) return res.status(500).json({ error: 'Não foi possível carregar quem segue.' });
  return res.json(users || []);
});

module.exports = router;
