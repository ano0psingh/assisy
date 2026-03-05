import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Assisy Feed Reader/1.0)',
        'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, text/html, */*',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream returned ${response.status} ${response.statusText}`,
      });
    }

    const body = await response.text();
    const contentType = response.headers.get('content-type') ?? 'text/plain';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Proxy error:', message, 'URL:', url);
    return res.status(502).json({ error: message });
  }
}
