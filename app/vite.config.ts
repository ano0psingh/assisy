import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

function localProxyPlugin(): Plugin {
  return {
    name: 'local-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost').searchParams.get('url');
        if (!url) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Assisy Feed Reader/1.0)',
              'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, text/html, */*',
            },
          });
          const body = await response.text();
          const ct = response.headers.get('content-type') ?? 'text/plain';
          res.writeHead(response.status, {
            'Content-Type': ct,
            'Access-Control-Allow-Origin': '*',
          });
          res.end(body);
        } catch (e) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Fetch failed' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localProxyPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        feed: resolve(__dirname, 'feed.html'),
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
})
