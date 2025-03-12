const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const type = req.query.type;
  const path = req.url.split('?')[0];
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let targetUrl;
    if (type === 'doge') {
      targetUrl = process.env.DOGE_URL || 'https://doge-unblocker.vercel.app';
    } else if (type === 'interstellar') {
      targetUrl = process.env.INTERSTELLAR_URL || 'https://interstellar-proxy.vercel.app';
    } else {
      return res.status(400).json({ error: 'Invalid proxy type' });
    }

    // Forward the request to the target
    const proxyUrl = `${targetUrl}${path}`;
    console.log('Proxying to:', proxyUrl);

    const proxyRes = await fetch(proxyUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    });

    // Forward the response headers
    Object.entries(proxyRes.headers.raw()).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Forward the response
    res.status(proxyRes.status);
    const data = await proxyRes.buffer();
    res.send(data);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}; 