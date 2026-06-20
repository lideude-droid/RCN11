require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ficheiros estáticos (login.html, dashboard.html, feed.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// API
app.use('/api', authRoutes);
app.use('/api', postsRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

// página inicial -> login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`RCN server a correr na porta ${PORT}`);
});
