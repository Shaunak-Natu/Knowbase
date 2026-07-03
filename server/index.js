const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // handled by nginx in prod
  crossOriginEmbedderPolicy: false
}));
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173'
app.use(cors({
  origin: allowedOrigin === '*' ? true : allowedOrigin,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/pages', require('./routes/pages'));
app.use('/api/files', require('./routes/files'));
app.use('/api', require('./routes/misc'));
app.use('/api', require('./routes/importexport'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../client/dist');
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }
}

// ─── START ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await initDB();
    console.log('✅ Database initialized');
    app.listen(PORT, () => {
      console.log(`🚀 KnowBase server running on port ${PORT}`);
      console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
