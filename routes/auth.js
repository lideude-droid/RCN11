const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const OWNER_ROLE_ID = '1395516741840273418';

router.get('/auth', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Falta o parâmetro "code".' });
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !REDIRECT_URI)
    return res.status(500).json({ error: 'Servidor mal configurado.' });

  try {
    // 1. troca code por access_token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      })
    });
    if (!tokenRes.ok) {
      console.error('[auth] erro token:', await tokenRes.text());
      return res.status(400).json({ error: 'Não foi possível validar o código com o Discord.' });
    }
    const tokenData = await tokenRes.json();

    // 2. busca dados do utilizador
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (!userRes.ok) return res.status(400).json({ error: 'Não foi possível obter os dados do utilizador.' });
    const user = await userRes.json();

    // 3. busca os cargos do utilizador no servidor RCN (requer guilds.members.read)
    let roles = [];
    if (DISCORD_GUILD_ID) {
      try {
        const memberRes = await fetch(
          `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
          { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
        );
        if (memberRes.ok) {
          const member = await memberRes.json();
          roles = member.roles || [];
        }
      } catch (e) {
        console.warn('[auth] não foi possível obter cargos do servidor:', e.message);
      }
    }

    // 4. guarda/atualiza o utilizador e os seus cargos na base de dados
    await supabase.from('users').upsert({
      discord_id: user.id,
      username: user.global_name || user.username,
      avatar: user.avatar,
      roles,
      last_seen: new Date().toISOString()
    }, { onConflict: 'discord_id' });

    const isOwner = roles.includes(OWNER_ROLE_ID);

    return res.json({
      id: user.id,
      username: user.global_name || user.username,
      avatar: user.avatar,
      roles,
      isOwner
    });
  } catch (err) {
    console.error('[auth] erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno ao autenticar.' });
  }
});

module.exports = router;
