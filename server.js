const fs = require('fs');

// carrega o .env normal (se existir na raiz)
require('dotenv').config();

// em serviços Docker no Render, os "Secret Files" ficam garantidamente em /etc/secrets/<nome>.
// se existir um .env ali, carrega-o também (sem substituir variáveis já definidas).
const renderSecretEnv = '/etc/secrets/.env';
if (fs.existsSync(renderSecretEnv)) {
  require('dotenv').config({ path: renderSecretEnv, override: false });
  console.log('[env] variáveis carregadas também de /etc/secrets/.env');
}

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const marketRoutes = require('./routes/market');
const socialRoutes = require('./routes/social');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ficheiros estáticos (login.html, dashboard.html, feed.html, admin.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// API pública e autenticada
app.use('/api', authRoutes);
app.use('/api', postsRoutes);
app.use('/api', publicRoutes);
app.use('/api', marketRoutes);
app.use('/api', socialRoutes);
app.use('/api', uploadRoutes);

// API de administração — montada em /api/admin para não interceptar outras rotas
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

// página inicial -> login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`RCN server a correr na porta ${PORT}`);
});
