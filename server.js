const express = require('express');
const path = require('path');
const cors = require('cors');

// Import proxy servers
const dogeApp = require('./repos/doge/index.js');
const interstellarApp = require('./repos/interstellar/index.js');

const app = express();
app.use(cors());

// Serve static files
app.use(express.static('public'));

// Mount Doge Unblocker at /doge
app.use('/doge', (req, res, next) => {
  // Set environment variables for Doge
  process.env.PORT = '8000';
  process.env.BARE_SERVER = '/bare/';
  process.env.UV_DIR = 'uv';
  process.env.CODEC_DIR = 'codec';
  process.env.BARE_APIS = 'https://uv.holyubofficial.net/,https://int.holyubofficial.net/,https://holy.holyubofficial.net/,https://rammerhead.holyubofficial.net/';
  dogeApp(req, res, next);
});

// Mount Interstellar at /interstellar
app.use('/interstellar', (req, res, next) => {
  // Set environment variables for Interstellar
  process.env.PORT = '8080';
  interstellarApp(req, res, next);
});

// Main interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// For Vercel
module.exports = app; 