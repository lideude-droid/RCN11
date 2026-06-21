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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ficheiros estáticos (login.html, dashboard.html, feed.html, admin.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// API
app.use('/api', authRoutes);
app.use('/api', postsRoutes);
app.use('/api', publicRoutes);
app.use('/api', adminRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

// página inicial -> login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`RCN server a correr na porta ${PORT}`);
});
