const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

module.exports = (req, res) => {
  const type = req.query.type;
  
  if (type === 'doge') {
    const proxy = createProxyMiddleware({
      target: process.env.DOGE_URL || 'https://doge-proxy.vercel.app',
      changeOrigin: true,
      pathRewrite: {'^/doge': ''},
    });
    return proxy(req, res);
  }
  
  if (type === 'interstellar') {
    const proxy = createProxyMiddleware({
      target: process.env.INTERSTELLAR_URL || 'https://interstellar-proxy.vercel.app',
      changeOrigin: true,
      pathRewrite: {'^/interstellar': ''},
    });
    return proxy(req, res);
  }
  
  return res.status(400).json({ error: 'Invalid proxy type' });
}; 