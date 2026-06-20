const express = require('express');
const router = express.Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

router.get('/auth', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Falta o parâmetro "code".' });
  }
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !REDIRECT_URI) {
    return res.status(500).json({
      error: 'Servidor mal configurado: faltam DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET ou REDIRECT_URI.'
    });
  }

  try {
    // troca o "code" por um access_token
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
      const errText = await tokenRes.text();
      console.error('[auth] erro a trocar o code:', errText);
      return res.status(400).json({ error: 'Não foi possível validar o código com o Discord.' });
    }

    const tokenData = await tokenRes.json();

    // vai buscar os dados do utilizador autenticado
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userRes.ok) {
      return res.status(400).json({ error: 'Não foi possível obter os dados do utilizador.' });
    }

    const user = await userRes.json();

    return res.json({
      id: user.id,
      username: user.global_name || user.username,
      avatar: user.avatar
    });
  } catch (err) {
    console.error('[auth] erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno ao autenticar.' });
  }
});

module.exports = router;
