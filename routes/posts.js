const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

// GET /api/posts -> lista os posts do feed, mais recentes primeiro
router.get('/posts', async (req, res) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[posts] erro a ler posts:', error);
    return res.status(500).json({ error: 'Não foi possível carregar o feed.' });
  }
  return res.json(data);
});

// POST /api/posts -> cria um novo post
// body: { image_url, caption, club, author_id, author_username, author_avatar }
router.post('/posts', async (req, res) => {
  const { image_url, caption, club, author_id, author_username, author_avatar } = req.body || {};

  if (!image_url || !author_id) {
    return res.status(400).json({ error: 'Faltam campos obrigatórios (image_url, author_id).' });
  }

  const { data, error } = await supabase
    .from('posts')
    .insert([{
      image_url,
      caption: caption || '',
      club: club || null,
      author_id,
      author_username: author_username || 'Jogador RCN',
      author_avatar: author_avatar || null,
      likes: []
    }])
    .select()
    .single();

  if (error) {
    console.error('[posts] erro a criar post:', error);
    return res.status(500).json({ error: 'Não foi possível publicar o post.' });
  }
  return res.status(201).json(data);
});

// POST /api/posts/:id/like -> alterna o gosto de um utilizador num post
// body: { user_id }
router.post('/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body || {};

  if (!user_id) {
    return res.status(400).json({ error: 'Falta "user_id".' });
  }

  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('likes')
    .eq('id', id)
    .single();

  if (fetchError || !post) {
    return res.status(404).json({ error: 'Post não encontrado.' });
  }

  const likes = Array.isArray(post.likes) ? post.likes : [];
  const alreadyLiked = likes.includes(user_id);
  const newLikes = alreadyLiked
    ? likes.filter((u) => u !== user_id)
    : [...likes, user_id];

  const { data, error } = await supabase
    .from('posts')
    .update({ likes: newLikes })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[posts] erro a atualizar gosto:', error);
    return res.status(500).json({ error: 'Não foi possível atualizar o gosto.' });
  }
  return res.json(data);
});

// DELETE /api/posts/:id -> remove um post (só o autor, validado pelo body)
router.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body || {};

  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', id)
    .single();

  if (fetchError || !post) {
    return res.status(404).json({ error: 'Post não encontrado.' });
  }
  if (post.author_id !== user_id) {
    return res.status(403).json({ error: 'Só o autor pode apagar este post.' });
  }

  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) {
    return res.status(500).json({ error: 'Não foi possível apagar o post.' });
  }
  return res.status(204).send();
});

module.exports = router;
