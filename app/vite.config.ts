import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import {
  AI_LIMITS,
  AIRequestError,
  generateAI,
  parseAIRequest,
} from './server/ai-service'
import type { AIEnvironment } from './server/ai-config'

function localApiPlugin(aiEnv: AIEnvironment): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Allow', 'POST, OPTIONS');
          res.end(JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }));
          return;
        }
        if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
          res.statusCode = 415;
          res.end(JSON.stringify({ error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' }));
          return;
        }

        try {
          let body = '';
          for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body, 'utf8') > AI_LIMITS.maxBodyBytes) {
              res.statusCode = 413;
              res.end(JSON.stringify({ error: 'Request body is too large', code: 'PAYLOAD_TOO_LARGE' }));
              return;
            }
          }
          const payload = parseAIRequest(JSON.parse(body));
          const result = await generateAI(payload, aiEnv);
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } catch (error) {
          if (error instanceof SyntaxError) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON body', code: 'INVALID_JSON' }));
            return;
          }
          if (error instanceof AIRequestError) {
            res.statusCode = error.status;
            res.end(JSON.stringify({ error: error.message, code: error.code }));
            return;
          }
          console.error('Local AI endpoint failed without provider details');
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'AI service failed', code: 'AI_ERROR' }));
        }
      });

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
export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), '');
  const aiEnv: AIEnvironment = {
    GROQ_API_KEY: process.env.GROQ_API_KEY ?? loadedEnv.GROQ_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? loadedEnv.GEMINI_API_KEY,
    VITE_GROQ_API_KEY: process.env.VITE_GROQ_API_KEY ?? loadedEnv.VITE_GROQ_API_KEY,
    VITE_GEMINI_API_KEY: process.env.VITE_GEMINI_API_KEY ?? loadedEnv.VITE_GEMINI_API_KEY,
  };

  return {
  plugins: [
    react(),
    localApiPlugin(aiEnv),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['vite.svg', 'icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'Assisy - Level Up Your Life',
        short_name: 'Assisy',
        description: 'Productivity app with tasks, goals, habits, projects, and AI-powered feed',
        theme_color: '#111113',
        background_color: '#111113',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            // User data, auth, and realtime responses are mutable and must never
            // be replayed from a service-worker cache.
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
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
  };
})
